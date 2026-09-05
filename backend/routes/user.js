import express from 'express';
import fs from 'fs';
import db from '../db.js';
import { authenticateToken } from '../middleware/auth.js';
import { upload } from '../middleware/upload.js';

const router = express.Router();

const MODES = ['solo', 'team'];

/** Bin an uploaded file that a validation error is about to reject. */
function discard(file) {
  if (file?.path) {
    fs.unlink(file.path, (err) => {
      if (err) console.error('Failed to remove rejected upload:', file.path, err.message);
    });
  }
}

function serializeUser(u) {
  return {
    id: u.id,
    email: u.email,
    firstName: u.first_name,
    lastName: u.last_name,
    phoneNumber: u.phone_number,
    college: u.college || null,
    idCardUrl: u.id_card_url,
    profilePicUrl: u.profile_pic_url,
    mode: u.mode || null,
    isOnboarded: Boolean(u.is_onboarded),
  };
}

function serializeTeammate(t) {
  if (!t) return null;
  return {
    firstName: t.first_name,
    lastName: t.last_name,
    phoneNumber: t.phone_number,
    email: t.email,
    college: t.college || null,
    idCardUrl: t.id_card_url,
  };
}

/**
 * POST /api/user/onboarding
 * Completes onboarding: own profile + the one-time solo/team choice. In team
 * mode the registrar also supplies the teammate's details (name, phone, email,
 * ID card) — the teammate never signs in.
 *
 * The mode is locked the first time it is set: a re-submission from an already
 * onboarded user keeps whatever mode is on record.
 */
router.post(
  '/onboarding',
  authenticateToken,
  upload.fields([
    { name: 'id_card', maxCount: 1 },
    { name: 'profile_pic', maxCount: 1 },
    { name: 'teammate_id_card', maxCount: 1 },
  ]),
  (req, res) => {
    const files = req.files || {};
    const ownIdCard = files['id_card']?.[0];
    const ownProfilePic = files['profile_pic']?.[0];
    const teammateIdCard = files['teammate_id_card']?.[0];

    const reject = (status, error) => {
      discard(ownIdCard);
      discard(ownProfilePic);
      discard(teammateIdCard);
      return res.status(status).json({ error });
    };

    try {
      const {
        first_name,
        last_name,
        phone_number,
        email,
        college: collegeRaw,
        mode: requestedMode,
        teammate_first_name,
        teammate_last_name,
        teammate_phone_number,
        teammate_email,
        teammate_college,
      } = req.body;

      const college = String(collegeRaw || '').trim();

      if (!first_name || !last_name || !phone_number || !email || !college) {
        return reject(400, 'First name, last name, phone number, email, and college are required.');
      }

      const existingTeammate = db
        .prepare('SELECT * FROM teammates WHERE user_id = ?')
        .get(req.user.id);

      // Mode is a one-time choice. Once set, incoming values are ignored.
      let mode = req.user.mode;
      if (!mode) {
        mode = String(requestedMode || '').trim().toLowerCase();
        if (!MODES.includes(mode)) {
          return reject(400, 'Choose solo or team to continue — this cannot be changed later.');
        }
      }

      // Own uploads — optional. Fall back to whatever is already on file.
      let idCardUrl = req.user.id_card_url;
      let profilePicUrl = req.user.profile_pic_url;

      if (ownIdCard) idCardUrl = `/uploads/${ownIdCard.filename}`;
      if (ownProfilePic) profilePicUrl = `/uploads/${ownProfilePic.filename}`;

      // Teammate details — only in team mode.
      let teammate = null;
      if (mode === 'team') {
        const tFirst = String(teammate_first_name || '').trim();
        const tLast = String(teammate_last_name || '').trim();
        const tPhone = String(teammate_phone_number || '').trim();
        const tEmail = String(teammate_email || '').trim();
        const tCollege = String(teammate_college || '').trim();

        if (!tFirst || !tLast || !tPhone || !tEmail || !tCollege) {
          return reject(400, "Your teammate's name, phone number, email, and college are all required.");
        }

        let teammateIdCardUrl = existingTeammate?.id_card_url || null;
        if (teammateIdCard) teammateIdCardUrl = `/uploads/${teammateIdCard.filename}`;

        teammate = {
          first_name: tFirst,
          last_name: tLast,
          phone_number: tPhone,
          email: tEmail,
          college: tCollege,
          id_card_url: teammateIdCardUrl,
        };
      }

      const save = db.transaction(() => {
        db.prepare(`
          UPDATE users
          SET first_name = ?, last_name = ?, phone_number = ?, email = ?, college = ?,
              id_card_url = ?, profile_pic_url = ?, mode = ?,
              is_onboarded = 1, updated_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `).run(first_name, last_name, phone_number, email, college, idCardUrl, profilePicUrl, mode, req.user.id);

        if (mode === 'team') {
          db.prepare(`
            INSERT INTO teammates (user_id, first_name, last_name, phone_number, email, college, id_card_url)
            VALUES (@user_id, @first_name, @last_name, @phone_number, @email, @college, @id_card_url)
            ON CONFLICT(user_id) DO UPDATE SET
              first_name = excluded.first_name,
              last_name = excluded.last_name,
              phone_number = excluded.phone_number,
              email = excluded.email,
              college = excluded.college,
              id_card_url = excluded.id_card_url,
              updated_at = CURRENT_TIMESTAMP
          `).run({ user_id: req.user.id, ...teammate });
        } else {
          db.prepare('DELETE FROM teammates WHERE user_id = ?').run(req.user.id);
        }
      });

      save();

      const updatedUser = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);
      const savedTeammate = db.prepare('SELECT * FROM teammates WHERE user_id = ?').get(req.user.id);

      res.json({
        message: 'Onboarding completed successfully!',
        user: serializeUser(updatedUser),
        teammate: serializeTeammate(savedTeammate),
      });
    } catch (error) {
      console.error('Onboarding error:', error);
      reject(500, 'Failed to complete onboarding: ' + error.message);
    }
  }
);

export default router;
