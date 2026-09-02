import express from 'express';
import { OAuth2Client } from 'google-auth-library';
import jwt from 'jsonwebtoken';
import db from '../db.js';
import { authenticateToken, JWT_SECRET } from '../middleware/auth.js';

const router = express.Router();
const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

/**
 * POST /api/auth/google
 * Authenticates user via Google OAuth ID token (or mock test payload in dev mode)
 */
router.post('/google', async (req, res) => {
  try {
    const { credential, testEmail, testName, testGoogleId } = req.body;

    let googleId;
    let email;
    let firstName = '';
    let lastName = '';

    // Dev-only test bypass — NEVER active in production (would be an auth hole).
    if (!credential && process.env.NODE_ENV !== 'production') {
      email = testEmail || 'testuser@example.com';
      googleId = testGoogleId || `google_test_${email.replace(/[^a-zA-Z0-9]/g, '_')}`;
      const nameParts = (testName || 'Test User').split(' ');
      firstName = nameParts[0] || '';
      lastName = nameParts.slice(1).join(' ') || '';
    } else if (credential) {
      // Verify Google ID Token
      const ticket = await googleClient.verifyIdToken({
        idToken: credential,
        audience: process.env.GOOGLE_CLIENT_ID,
      });
      const payload = ticket.getPayload();
      googleId = payload['sub'];
      email = payload['email'];
      firstName = payload['given_name'] || '';
      lastName = payload['family_name'] || '';
    } else {
      return res.status(400).json({ error: 'Google credential token is required.' });
    }

    // Check if user exists
    let user = db.prepare('SELECT * FROM users WHERE google_id = ?').get(googleId);

    if (!user) {
      // Insert new user
      const result = db.prepare(`
        INSERT INTO users (google_id, email, first_name, last_name, is_onboarded)
        VALUES (?, ?, ?, ?, 0)
      `).run(googleId, email, firstName, lastName);

      user = db.prepare('SELECT * FROM users WHERE id = ?').get(result.lastInsertRowid);
    }

    // Generate JWT token
    const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: '7d' });

    res.json({
      message: 'Authentication successful',
      token,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        phoneNumber: user.phone_number,
        idCardUrl: user.id_card_url,
        profilePicUrl: user.profile_pic_url,
        mode: user.mode || null,
        isOnboarded: Boolean(user.is_onboarded),
      },
    });
  } catch (error) {
    console.error('Google OAuth error:', error);
    res.status(500).json({ error: 'Authentication failed: ' + error.message });
  }
});

/**
 * GET /api/auth/me
 * Retrieves full details of logged-in user, registration, and team
 */
router.get('/me', authenticateToken, (req, res) => {
  const user = req.user;

  // Get user's event registration
  const registration = db.prepare(`
    SELECT * FROM registrations WHERE user_id = ?
  `).get(user.id);

  // Team mode: the teammate the registrar entered at onboarding.
  const teammate = db.prepare('SELECT * FROM teammates WHERE user_id = ?').get(user.id);

  res.json({
    user: {
      id: user.id,
      email: user.email,
      firstName: user.first_name,
      lastName: user.last_name,
      phoneNumber: user.phone_number,
      idCardUrl: user.id_card_url,
      profilePicUrl: user.profile_pic_url,
      mode: user.mode || null,
      isOnboarded: Boolean(user.is_onboarded),
    },
    registration: registration ? {
      id: registration.id,
      eventId: registration.event_id,
      paymentScreenshotUrl: registration.payment_screenshot_url,
      transactionId: registration.transaction_id,
      status: registration.status,
      createdAt: registration.created_at,
    } : null,
    teammate: teammate ? {
      firstName: teammate.first_name,
      lastName: teammate.last_name,
      phoneNumber: teammate.phone_number,
      email: teammate.email,
      idCardUrl: teammate.id_card_url,
    } : null,
  });
});

export default router;
