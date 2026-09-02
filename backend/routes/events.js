import express from 'express';
import fs from 'fs';
import db from '../db.js';
import { authenticateToken } from '../middleware/auth.js';
import { upload } from '../middleware/upload.js';

const router = express.Router();

export const HARDCODED_EVENTS = [
  {
    id: 'scrolls-of-the-realm',
    name: 'Scrolls of the Realm',
    tagline: 'Technical Paper & Research Presentation',
    category: 'Paper Presentation',
  },
  {
    id: 'iron-throne',
    name: 'Iron Throne',
    tagline: 'Competitive Coding & Algorithmic Conquest',
    category: 'Coding',
  },
  {
    id: 'siege-of-servers',
    name: 'Siege of Servers',
    tagline: 'Cyber Defence, Capture The Flag & Network Exploits',
    category: 'CTF & Security',
  },
  {
    id: 'winter-war',
    name: 'Winter War',
    tagline: 'High-Intensity Technical & Gaming Arena',
    category: 'Gaming & Tech',
  },
  {
    id: 'tessarions-trail',
    name: 'Tessarion\'s Trail',
    tagline: 'Cryptic Treasure Hunt & Cipher Quest',
    category: 'Treasure Hunt',
  },
];

/**
 * GET /api/events
 * List all available symposium events
 */
router.get('/', (req, res) => {
  res.json({ events: HARDCODED_EVENTS });
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
      const eventExists = HARDCODED_EVENTS.some((e) => e.id === event_id);
      if (!event_id || !eventExists) {
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

      const paymentScreenshotUrl = `/uploads/${file.filename}`;

      // 6. Insert registration
      const result = db.prepare(`
        INSERT INTO registrations (user_id, event_id, payment_screenshot_url, transaction_id, status)
        VALUES (?, ?, ?, ?, 'pending')
      `).run(user.id, event_id, paymentScreenshotUrl, transactionId);

      const registration = db.prepare('SELECT * FROM registrations WHERE id = ?').get(result.lastInsertRowid);

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
