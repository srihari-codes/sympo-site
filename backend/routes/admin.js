import express from 'express';
import db from '../db.js';
import { authenticateToken, requireAdmin, isAdminEmail } from '../middleware/auth.js';
import { HARDCODED_EVENTS, TOTAL_CAPACITY, eventFill } from './events.js';

const router = express.Router();

const eventName = (id) => HARDCODED_EVENTS.find((e) => e.id === id)?.name || id;

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
              u.id AS user_id, u.first_name, u.last_name, u.email, u.phone_number,
              u.id_card_url, u.profile_pic_url, u.is_onboarded, u.mode,
              tm.first_name AS tm_first, tm.last_name AS tm_last, tm.phone_number AS tm_phone,
              tm.email AS tm_email, tm.id_card_url AS tm_id_card
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

  const reg = db.prepare('SELECT * FROM registrations WHERE id = ?').get(req.params.id);
  if (!reg) {
    return res.status(404).json({ error: 'Registration not found.' });
  }

  db.prepare('UPDATE registrations SET status = ? WHERE id = ?').run(status, reg.id);
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
              tm.email AS tm_email, tm.id_card_url AS tm_id_card
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
      `SELECT u.id AS user_id, u.first_name, u.last_name, u.email, u.phone_number,
              u.id_card_url, u.created_at,
              tm.first_name AS tm_first, tm.last_name AS tm_last, tm.phone_number AS tm_phone,
              tm.email AS tm_email, tm.id_card_url AS tm_id_card,
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
          idCardUrl: r.id_card_url,
          isLeader: true,
        },
        {
          firstName: r.tm_first,
          lastName: r.tm_last,
          email: r.tm_email,
          phoneNumber: r.tm_phone,
          idCardUrl: r.tm_id_card,
          isLeader: false,
        },
      ],
    })),
  });
});

export default router;
