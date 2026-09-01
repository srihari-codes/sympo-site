import express from 'express';
import db from '../db.js';
import { authenticateToken } from '../middleware/auth.js';
import { upload } from '../middleware/upload.js';

const router = express.Router();

/**
 * POST /api/user/onboarding
 * Completes user onboarding with firstname, lastname, phone, email, id card picture, and profile picture
 */
router.post(
  '/onboarding',
  authenticateToken,
  upload.fields([
    { name: 'id_card', maxCount: 1 },
    { name: 'profile_pic', maxCount: 1 },
  ]),
  (req, res) => {
    try {
      const { first_name, last_name, phone_number, email } = req.body;
      const files = req.files;

      if (!first_name || !last_name || !phone_number || !email) {
        return res.status(400).json({ error: 'First name, last name, phone number, and email are required.' });
      }

      // Check for file uploads
      let idCardUrl = req.user.id_card_url;
      let profilePicUrl = req.user.profile_pic_url;

      if (files && files['id_card'] && files['id_card'][0]) {
        idCardUrl = `/uploads/${files['id_card'][0].filename}`;
      } else if (!idCardUrl) {
        return res.status(400).json({ error: 'ID card picture upload is required.' });
      }

      if (files && files['profile_pic'] && files['profile_pic'][0]) {
        profilePicUrl = `/uploads/${files['profile_pic'][0].filename}`;
      } else if (!profilePicUrl) {
        return res.status(400).json({ error: 'Profile/ID picture upload is required.' });
      }

      // Update user record
      db.prepare(`
        UPDATE users
        SET first_name = ?,
            last_name = ?,
            phone_number = ?,
            email = ?,
            id_card_url = ?,
            profile_pic_url = ?,
            is_onboarded = 1,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(first_name, last_name, phone_number, email, idCardUrl, profilePicUrl, req.user.id);

      const updatedUser = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);

      res.json({
        message: 'Onboarding completed successfully!',
        user: {
          id: updatedUser.id,
          email: updatedUser.email,
          firstName: updatedUser.first_name,
          lastName: updatedUser.last_name,
          phoneNumber: updatedUser.phone_number,
          idCardUrl: updatedUser.id_card_url,
          profilePicUrl: updatedUser.profile_pic_url,
          isOnboarded: Boolean(updatedUser.is_onboarded),
        },
      });
    } catch (error) {
      console.error('Onboarding error:', error);
      res.status(500).json({ error: 'Failed to complete onboarding: ' + error.message });
    }
  }
);

export default router;
