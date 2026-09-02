import express from 'express';
import fs from 'fs';
import db from '../db.js';
import { authenticateToken } from '../middleware/auth.js';
import { upload } from '../middleware/upload.js';
import { sendRegistrationConfirmation } from '../emails/registrationConfirmation.js';

const router = express.Router();

// `capacity` is the hard cap on *participants* (not registrations) for the
// event. A solo registration is 1 participant, a team registration is 2 — so
// Scrolls fits 12 solos, or 6 teams, or any mix totalling 12; every other
// event fits 16. The per-event caps sum to TOTAL_CAPACITY (76).
export const HARDCODED_EVENTS = [
  {
    id: 'scrolls-of-the-realm',
    name: 'Scrolls of the Realm',
    tagline: 'Technical Paper & Research Presentation',
    category: 'Paper Presentation',
    capacity: 12,
  },
  {
    id: 'iron-throne',
    name: 'Iron Throne',
    tagline: 'Jeopardy-Style Capture The Flag (CTF)',
    category: 'Jeopardy CTF',
    capacity: 16,
  },
  {
    id: 'siege-of-servers',
    name: 'Siege of Servers',
    tagline: 'Attack-Defense CTF & Server Exploits',
    category: 'Attack-Defense CTF',
    capacity: 16,
  },
  {
    id: 'winter-war',
    name: 'Winter War',
    tagline: 'Boot2Root & Privilege Escalation CTF',
    category: 'Boot2Root CTF',
    capacity: 16,
  },
  {
    id: 'tessarions-trail',
    name: "Tessarion's Trail",
    tagline: 'OSINT & Digital Forensics Investigation',
    category: 'OSINT & Digital Forensics',
    capacity: 16,
  },
];

export const TOTAL_CAPACITY = HARDCODED_EVENTS.reduce((n, e) => n + e.capacity, 0);

const participantsForMode = (mode) => (mode === 'team' ? 2 : 1);

/**
 * Live participant fill for one event. Rejected registrations free their spot;
 * pending and approved both hold one.
 */
export function eventFill(eventId) {
  const row = db
    .prepare(
      `SELECT COALESCE(SUM(CASE WHEN u.mode = 'team' THEN 2 ELSE 1 END), 0) AS participants,
              COUNT(*) AS registrations
       FROM registrations r
       JOIN users u ON u.id = r.user_id
       WHERE r.event_id = ? AND r.status != 'rejected'`
    )
    .get(eventId);
  return { participants: row.participants, registrations: row.registrations };
}

/** Every event decorated with its current fill / remaining spots. */
export function eventsWithFill() {
  return HARDCODED_EVENTS.map((e) => {
    const { participants, registrations } = eventFill(e.id);
    return {
      ...e,
      participants,
      registrations,
      spotsLeft: Math.max(0, e.capacity - participants),
      isFull: participants >= e.capacity,
    };
  });
}

/**
 * GET /api/events
 * All events with their live capacity / fill.
 */
router.get('/', (req, res) => {
  const events = eventsWithFill();
  res.json({
    events,
    totalCapacity: TOTAL_CAPACITY,
    totalParticipants: events.reduce((n, e) => n + e.participants, 0),
  });
});

/**
 * POST /api/events/register
 * Registers user for 1 event with payment screenshot upload
 */
router.post(
  '/register',
  authenticateToken,
  upload.single('payment_screenshot'),
  (req, res) => {
    // Multer has already written the upload to disk by the time this runs, so
    // every rejection below has to bin it — otherwise failed attempts silently
    // fill the uploads volume on a 1 GB box.
    const reject = (status, body) => {
      if (req.file?.path) {
        fs.unlink(req.file.path, (err) => {
          if (err) console.error('Failed to remove rejected upload:', req.file.path, err.message);
        });
      }
      return res.status(status).json(body);
    };

    try {
      const user = req.user;

      // 1. Check onboarding status
      if (!user.is_onboarded) {
        return reject(400, { error: 'You must complete onboarding before registering for an event.' });
      }

      // 2. Enforce 1 event registration per user rule
      const existingReg = db.prepare('SELECT * FROM registrations WHERE user_id = ?').get(user.id);
      if (existingReg) {
        const registeredEvent = HARDCODED_EVENTS.find((e) => e.id === existingReg.event_id);
        const eventName = registeredEvent ? registeredEvent.name : existingReg.event_id;
        return reject(400, {
          error: `You are already registered for '${eventName}'. Users can register for only 1 event.`,
          existingRegistration: existingReg,
        });
      }

      const { event_id, transaction_id } = req.body;
      const file = req.file;

      // 3. Validate event ID
      const event = HARDCODED_EVENTS.find((e) => e.id === event_id);
      if (!event_id || !event) {
        return reject(400, { error: 'Invalid event selected. Please select a valid symposium event.' });
      }

      // 4. Validate payment screenshot upload
      if (!file) {
        return res.status(400).json({ error: 'Payment screenshot image is required to complete registration.' });
      }

      // 5. Validate the bank reference / transaction ID
      const transactionId = String(transaction_id || '').trim();
      if (!transactionId) {
        return reject(400, { error: 'Reference ID / Transaction ID is required to complete registration.' });
      }
      if (transactionId.length < 6 || transactionId.length > 40) {
        return reject(400, { error: 'Reference ID / Transaction ID must be between 6 and 40 characters.' });
      }

      // Same reference twice means a screenshot is being reused across accounts.
      const duplicate = db
        .prepare('SELECT id FROM registrations WHERE transaction_id = ?')
        .get(transactionId);
      if (duplicate) {
        return reject(409, {
          error: 'That Reference ID / Transaction ID has already been used for another registration.',
        });
      }

      // 6. Enforce the event's participant cap. Everything from here to the
      // INSERT runs synchronously with no await, so this check + insert is
      // atomic for the single backend process — no double-booking a last spot.
      const incoming = participantsForMode(user.mode || 'solo');
      const { participants } = eventFill(event_id);
      if (participants + incoming > event.capacity) {
        const left = Math.max(0, event.capacity - participants);
        return reject(409, {
          error:
            left === 0
              ? `'${event.name}' is full — all ${event.capacity} places are taken. Please choose another event.`
              : `'${event.name}' has only ${left} place${left === 1 ? '' : 's'} left — not enough for a team of 2. Register solo or choose another event.`,
        });
      }

      const paymentScreenshotUrl = `/uploads/${file.filename}`;

      // 7. Insert registration
      const result = db.prepare(`
        INSERT INTO registrations (user_id, event_id, payment_screenshot_url, transaction_id, status)
        VALUES (?, ?, ?, ?, 'pending')
      `).run(user.id, event_id, paymentScreenshotUrl, transactionId);

      const registration = db.prepare('SELECT * FROM registrations WHERE id = ?').get(result.lastInsertRowid);

      const eventDetails = HARDCODED_EVENTS.find((e) => e.id === event_id);

      // Fire-and-forget — don't block the response on email delivery.
      sendRegistrationConfirmation({
        to: user.email,
        firstName: user.first_name,
        eventName: eventDetails?.name || event_id,
        eventTagline: eventDetails?.tagline || '',
        transactionId,
      }).catch((err) => console.error('📧 Confirmation email failed:', err.message));

      res.status(201).json({
        message: 'Event registration submitted successfully!',
        registration: {
          id: registration.id,
          eventId: registration.event_id,
          paymentScreenshotUrl: registration.payment_screenshot_url,
          transactionId: registration.transaction_id,
          status: registration.status,
          createdAt: registration.created_at,
        },
      });
    } catch (error) {
      console.error('Registration error:', error);
      reject(500, { error: 'Failed to register for event: ' + error.message });
    }
  }
);

/**
 * GET /api/events/my-registration
 * Get current user's registration
 */
router.get('/my-registration', authenticateToken, (req, res) => {
  const registration = db.prepare('SELECT * FROM registrations WHERE user_id = ?').get(req.user.id);
  if (!registration) {
    return res.json({ registration: null });
  }

  const eventDetails = HARDCODED_EVENTS.find((e) => e.id === registration.event_id);

  res.json({
    registration: {
      id: registration.id,
      eventId: registration.event_id,
      eventDetails,
      paymentScreenshotUrl: registration.payment_screenshot_url,
      transactionId: registration.transaction_id,
      status: registration.status,
      createdAt: registration.created_at,
    },
  });
});

export default router;
