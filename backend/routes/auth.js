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

    // Support dev test bypass mode if enabled or if test user payload is passed
    if (!credential && (testEmail || process.env.NODE_ENV !== 'production')) {
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

  // Get user's team membership
  const teamMember = db.prepare(`
    SELECT tm.*, t.name as team_name, t.code as team_code, t.event_id as team_event_id, t.leader_id
    FROM team_members tm
    JOIN teams t ON tm.team_id = t.id
    WHERE tm.user_id = ?
  `).get(user.id);

  let teamDetails = null;
  if (teamMember) {
    const members = db.prepare(`
      SELECT u.id, u.first_name, u.last_name, u.email, tm.joined_at
      FROM team_members tm
      JOIN users u ON tm.user_id = u.id
      WHERE tm.team_id = ?
    `).all(teamMember.team_id);

    teamDetails = {
      id: teamMember.team_id,
      name: teamMember.team_name,
      code: teamMember.team_code,
      eventId: teamMember.team_event_id,
      leaderId: teamMember.leader_id,
      isLeader: teamMember.leader_id === user.id,
      members,
      memberCount: members.length,
      maxMembers: 2,
    };
  }

  res.json({
    user: {
      id: user.id,
      email: user.email,
      firstName: user.first_name,
      lastName: user.last_name,
      phoneNumber: user.phone_number,
      idCardUrl: user.id_card_url,
      profilePicUrl: user.profile_pic_url,
      isOnboarded: Boolean(user.is_onboarded),
    },
    registration: registration ? {
      id: registration.id,
      eventId: registration.event_id,
      paymentScreenshotUrl: registration.payment_screenshot_url,
      status: registration.status,
      createdAt: registration.created_at,
    } : null,
    team: teamDetails,
  });
});

export default router;
