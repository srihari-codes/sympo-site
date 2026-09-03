import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import db from '../db.js';
import { authenticateToken, requireAdmin, isAdminEmail } from '../middleware/auth.js';
import { HARDCODED_EVENTS, TOTAL_CAPACITY, eventFill } from './events.js';
import { sendRegistrationApproval } from '../emails/registrationApproval.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const uploadsDir = process.env.UPLOAD_DIR || path.join(__dirname, '..', 'uploads');

/** Silently remove an uploaded file by its URL path (e.g. '/uploads/abc.jpg'). */
function removeUpload(urlPath) {
  if (!urlPath) return;
  const basename = path.basename(urlPath);
  const filePath = path.join(uploadsDir, basename);
  fs.unlink(filePath, (err) => {
    if (err && err.code !== 'ENOENT') {
      console.error('⚠ Failed to remove upload:', filePath, err.message);
    }
  });
}

const router = express.Router();

const eventName = (id) => HARDCODED_EVENTS.find((e) => e.id === id)?.name || id;
const eventTagline = (id) => HARDCODED_EVENTS.find((e) => e.id === id)?.tagline || '';

// Every route here requires a valid login AND an email listed in ADMIN_EMAILS.
router.use(authenticateToken, requireAdmin);

/**
 * GET /api/admin/whoami
 * Lightweight check the admin page uses right after login.
 */
router.get('/whoami', (req, res) => {
  res.json({
    isAdmin: isAdminEmail(req.user.email),
    email: req.user.email,
    name: `${req.user.first_name || ''} ${req.user.last_name || ''}`.trim(),
  });
});

/**
 * GET /api/admin/summary
 * Headline counts for the dashboard.
 */
router.get('/summary', (req, res) => {
  const one = (sql) => db.prepare(sql).get().n;

  const byStatus = db
    .prepare('SELECT status, COUNT(*) AS n FROM registrations GROUP BY status')
    .all()
    .reduce((acc, r) => ({ ...acc, [r.status]: r.n }), {});

  // Every event, in fixed order, with its participant fill against capacity.
  const byEvent = HARDCODED_EVENTS.map((e) => {
    const { participants, registrations } = eventFill(e.id);
    return {
      eventId: e.id,
      eventName: e.name,
      count: registrations,
      participants,
      capacity: e.capacity,
      spotsLeft: Math.max(0, e.capacity - participants),
      isFull: participants >= e.capacity,
    };
  });

  res.json({
    users: one('SELECT COUNT(*) AS n FROM users'),
    onboarded: one('SELECT COUNT(*) AS n FROM users WHERE is_onboarded = 1'),
    registrations: one('SELECT COUNT(*) AS n FROM registrations'),
    soloRegistrations: one("SELECT COUNT(*) AS n FROM registrations r JOIN users u ON u.id = r.user_id WHERE u.mode = 'solo'"),
    teamRegistrations: one("SELECT COUNT(*) AS n FROM registrations r JOIN users u ON u.id = r.user_id WHERE u.mode = 'team'"),
    teams: one("SELECT COUNT(*) AS n FROM teammates"),
    participants: byEvent.reduce((n, e) => n + e.participants, 0),
    totalCapacity: TOTAL_CAPACITY,
    registrationsByStatus: {
      pending: byStatus.pending || 0,
      approved: byStatus.approved || 0,
      rejected: byStatus.rejected || 0,
    },
    registrationsByEvent: byEvent,
  });
});

/**
 * GET /api/admin/registrations
 * Every registration joined with its user, event and team.
 */
router.get('/registrations', (req, res) => {
  const rows = db
    .prepare(
      `SELECT r.id, r.event_id, r.payment_screenshot_url, r.transaction_id, r.status, r.created_at,
              u.id AS user_id, u.first_name, u.last_name, u.email, u.phone_number, u.college,
              u.id_card_url, u.profile_pic_url, u.is_onboarded, u.mode,
              tm.first_name AS tm_first, tm.last_name AS tm_last, tm.phone_number AS tm_phone,
              tm.email AS tm_email, tm.college AS tm_college, tm.id_card_url AS tm_id_card
       FROM registrations r
       JOIN users u ON u.id = r.user_id
       LEFT JOIN teammates tm ON tm.user_id = u.id
       ORDER BY r.created_at DESC`
    )
    .all();

  res.json({
    registrations: rows.map((r) => ({
      id: r.id,
      status: r.status,
      createdAt: r.created_at,
      mode: r.mode || 'solo',
      event: { id: r.event_id, name: eventName(r.event_id) },
      paymentScreenshotUrl: r.payment_screenshot_url,
      transactionId: r.transaction_id,
      user: {
        id: r.user_id,
        firstName: r.first_name,
        lastName: r.last_name,
        email: r.email,
        phoneNumber: r.phone_number,
        college: r.college || null,
        idCardUrl: r.id_card_url,
        profilePicUrl: r.profile_pic_url,
        isOnboarded: Boolean(r.is_onboarded),
      },
      teammate: r.mode === 'team' && r.tm_first
        ? {
            firstName: r.tm_first,
            lastName: r.tm_last,
            phoneNumber: r.tm_phone,
            email: r.tm_email,
            college: r.tm_college || null,
            idCardUrl: r.tm_id_card,
          }
        : null,
    })),
  });
});

/**
 * PATCH /api/admin/registrations/:id
 * Body: { status: "pending" | "approved" | "rejected" }
 */
router.patch('/registrations/:id', (req, res) => {
  const { status } = req.body;
  const allowed = ['pending', 'approved', 'rejected'];
  if (!allowed.includes(status)) {
    return res.status(400).json({ error: `status must be one of ${allowed.join(', ')}` });
  }

  const reg = db
    .prepare(
      `SELECT r.*, u.first_name, u.last_name, u.email, u.mode,
              tm.first_name AS tm_first, tm.email AS tm_email
       FROM registrations r
       JOIN users u ON u.id = r.user_id
       LEFT JOIN teammates tm ON tm.user_id = u.id
       WHERE r.id = ?`
    )
    .get(req.params.id);

  if (!reg) {
    return res.status(404).json({ error: 'Registration not found.' });
  }

  const oldStatus = reg.status;
  db.prepare('UPDATE registrations SET status = ? WHERE id = ?').run(status, reg.id);

  // Send status update email if status changed to approved or rejected
  if (oldStatus !== status && (status === 'approved' || status === 'rejected')) {
    const eName = eventName(reg.event_id);
    const eTagline = eventTagline(reg.event_id);

    // Send to primary participant
    if (reg.email) {
      sendRegistrationApproval({
        to: reg.email,
        firstName: reg.first_name,
        eventName: eName,
        eventTagline: eTagline,
        transactionId: reg.transaction_id,
        status,
      }).catch((err) => console.error(`📧 Admin ${status} email failed for ${reg.email}:`, err.message));
    }

    // If team mode, also send to teammate if email is present
    if (reg.mode === 'team' && reg.tm_email) {
      sendRegistrationApproval({
        to: reg.tm_email,
        firstName: reg.tm_first || 'Teammate',
        eventName: eName,
        eventTagline: eTagline,
        transactionId: reg.transaction_id,
        status,
      }).catch((err) => console.error(`📧 Admin ${status} email failed for teammate ${reg.tm_email}:`, err.message));
    }
  }

  res.json({ id: reg.id, status });
});

/**
 * GET /api/admin/users
 * All users with a rollup of their registration + team.
 */
router.get('/users', (req, res) => {
  const rows = db
    .prepare(
      `SELECT u.*,
              r.event_id AS reg_event_id, r.status AS reg_status,
              tm.first_name AS tm_first, tm.last_name AS tm_last, tm.phone_number AS tm_phone,
              tm.email AS tm_email, tm.college AS tm_college, tm.id_card_url AS tm_id_card
       FROM users u
       LEFT JOIN registrations r ON r.user_id = u.id
       LEFT JOIN teammates tm ON tm.user_id = u.id
       ORDER BY u.created_at DESC`
    )
    .all();

  res.json({
    users: rows.map((u) => ({
      id: u.id,
      firstName: u.first_name,
      lastName: u.last_name,
      email: u.email,
      phoneNumber: u.phone_number,
      college: u.college || null,
      idCardUrl: u.id_card_url,
      profilePicUrl: u.profile_pic_url,
      mode: u.mode || null,
      isOnboarded: Boolean(u.is_onboarded),
      createdAt: u.created_at,
      registration: u.reg_event_id
        ? { eventId: u.reg_event_id, eventName: eventName(u.reg_event_id), status: u.reg_status }
        : null,
      teammate: u.mode === 'team' && u.tm_first
        ? {
            firstName: u.tm_first,
            lastName: u.tm_last,
            phoneNumber: u.tm_phone,
            email: u.tm_email,
            college: u.tm_college || null,
            idCardUrl: u.tm_id_card,
          }
        : null,
    })),
  });
});

/**
 * GET /api/admin/teams
 * Every team-mode participant paired with the teammate they registered. The
 * registrar is always the leader; the teammate has no account.
 */
router.get('/teams', (req, res) => {
  const rows = db
    .prepare(
      `SELECT u.id AS user_id, u.first_name, u.last_name, u.email, u.phone_number, u.college,
              u.id_card_url, u.created_at,
              tm.first_name AS tm_first, tm.last_name AS tm_last, tm.phone_number AS tm_phone,
              tm.email AS tm_email, tm.college AS tm_college, tm.id_card_url AS tm_id_card,
              r.event_id, r.status AS reg_status
       FROM teammates tm
       JOIN users u ON u.id = tm.user_id
       LEFT JOIN registrations r ON r.user_id = u.id
       ORDER BY u.created_at DESC`
    )
    .all();

  res.json({
    teams: rows.map((r) => ({
      id: r.user_id,
      name: `${r.first_name || ''} ${r.last_name || ''}`.trim() + ' + ' +
        `${r.tm_first || ''} ${r.tm_last || ''}`.trim(),
      event: r.event_id
        ? { id: r.event_id, name: eventName(r.event_id) }
        : { id: null, name: 'Not registered yet' },
      registrationStatus: r.reg_status || null,
      createdAt: r.created_at,
      memberCount: 2,
      maxMembers: 2,
      members: [
        {
          firstName: r.first_name,
          lastName: r.last_name,
          email: r.email,
          phoneNumber: r.phone_number,
          college: r.college || null,
          idCardUrl: r.id_card_url,
          isLeader: true,
        },
        {
          firstName: r.tm_first,
          lastName: r.tm_last,
          email: r.tm_email,
          phoneNumber: r.tm_phone,
          college: r.tm_college || null,
          idCardUrl: r.tm_id_card,
          isLeader: false,
        },
      ],
    })),
  });
});

/**
 * DELETE /api/admin/users/:id
 * Permanently delete a user account and all associated data.
 * SQLite ON DELETE CASCADE handles: registrations, teammates, team_members, teams.
 * Uploaded files (profile pic, ID card, payment screenshot) are cleaned from disk.
 */
router.delete('/users/:id', (req, res) => {
  const userId = Number(req.params.id);

  // Safety: prevent admin from deleting their own account
  if (userId === req.user.id) {
    return res.status(400).json({ error: 'You cannot delete your own admin account.' });
  }

  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
  if (!user) {
    return res.status(404).json({ error: 'User not found.' });
  }

  // Collect file paths to clean up before deleting DB rows
  const reg = db.prepare('SELECT payment_screenshot_url FROM registrations WHERE user_id = ?').get(userId);
  const teammate = db.prepare('SELECT id_card_url FROM teammates WHERE user_id = ?').get(userId);

  // Delete the user — CASCADE handles registrations, teammates, team_members, teams
  db.prepare('DELETE FROM users WHERE id = ?').run(userId);

  // Clean up uploaded files from disk
  removeUpload(user.profile_pic_url);
  removeUpload(user.id_card_url);
  if (reg) removeUpload(reg.payment_screenshot_url);
  if (teammate) removeUpload(teammate.id_card_url);

  console.log(`🗑 Admin ${req.user.email} deleted user #${userId} (${user.email})`);

  res.json({
    message: 'User account deleted successfully.',
    deleted: {
      id: userId,
      email: user.email,
      name: `${user.first_name || ''} ${user.last_name || ''}`.trim(),
    },
  });
});

/**
 * DELETE /api/admin/teams/:userId
 * Remove a team (teammate record + associated registration).
 * The registrar's user account is kept but reset to un-onboarded.
 */
router.delete('/teams/:userId', (req, res) => {
  const userId = Number(req.params.userId);

  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
  if (!user) {
    return res.status(404).json({ error: 'User not found.' });
  }

  const teammate = db.prepare('SELECT * FROM teammates WHERE user_id = ?').get(userId);
  if (!teammate) {
    return res.status(404).json({ error: 'No team found for this user.' });
  }

  // Collect file paths for cleanup
  const reg = db.prepare('SELECT payment_screenshot_url FROM registrations WHERE user_id = ?').get(userId);

  // All three writes land together — a half-removed team would leave the
  // registrar holding a registration for a teammate who no longer exists.
  const removeTeam = db.transaction(() => {
    // Remove teammate record
    db.prepare('DELETE FROM teammates WHERE user_id = ?').run(userId);

    // Remove the associated registration (team registration is invalid without teammate)
    db.prepare('DELETE FROM registrations WHERE user_id = ?').run(userId);

    // Reset user so they can re-onboard (solo or new team)
    db.prepare('UPDATE users SET mode = NULL, is_onboarded = 0 WHERE id = ?').run(userId);
  });
  removeTeam();

  // Clean up uploaded files (only once the rows are committed)
  removeUpload(teammate.id_card_url);
  if (reg) removeUpload(reg.payment_screenshot_url);

  console.log(`🗑 Admin ${req.user.email} removed team for user #${userId} (${user.email})`);

  res.json({
    message: 'Team removed successfully. The registrar account has been reset.',
    deleted: {
      userId,
      registrarEmail: user.email,
      teammateName: `${teammate.first_name || ''} ${teammate.last_name || ''}`.trim(),
    },
  });
});

export default router;
