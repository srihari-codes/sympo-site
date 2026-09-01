import express from 'express';
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
    try {
      const user = req.user;

      // 1. Check onboarding status
      if (!user.is_onboarded) {
        return res.status(400).json({ error: 'You must complete onboarding before registering for an event.' });
      }

      // 2. Enforce 1 event registration per user rule
      const existingReg = db.prepare('SELECT * FROM registrations WHERE user_id = ?').get(user.id);
      if (existingReg) {
        const registeredEvent = HARDCODED_EVENTS.find((e) => e.id === existingReg.event_id);
        const eventName = registeredEvent ? registeredEvent.name : existingReg.event_id;
        return res.status(400).json({
          error: `You are already registered for '${eventName}'. Users can register for only 1 event.`,
          existingRegistration: existingReg,
        });
      }

      const { event_id } = req.body;
      const file = req.file;

      // 3. Validate event ID
      const eventExists = HARDCODED_EVENTS.some((e) => e.id === event_id);
      if (!event_id || !eventExists) {
        return res.status(400).json({ error: 'Invalid event selected. Please select a valid symposium event.' });
      }

      // 4. Validate payment screenshot upload
      if (!file) {
        return res.status(400).json({ error: 'Payment screenshot image is required to complete registration.' });
      }

      const paymentScreenshotUrl = `/uploads/${file.filename}`;

      // 5. Insert registration
      const result = db.prepare(`
        INSERT INTO registrations (user_id, event_id, payment_screenshot_url, status)
        VALUES (?, ?, ?, 'pending')
      `).run(user.id, event_id, paymentScreenshotUrl);

      const registration = db.prepare('SELECT * FROM registrations WHERE id = ?').get(result.lastInsertRowid);

      res.status(201).json({
        message: 'Event registration submitted successfully!',
        registration: {
          id: registration.id,
          eventId: registration.event_id,
          paymentScreenshotUrl: registration.payment_screenshot_url,
          status: registration.status,
          createdAt: registration.created_at,
        },
      });
    } catch (error) {
      console.error('Registration error:', error);
      res.status(500).json({ error: 'Failed to register for event: ' + error.message });
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
      status: registration.status,
      createdAt: registration.created_at,
    },
  });
});

export default router;
