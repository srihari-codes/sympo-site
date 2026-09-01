import express from 'express';
import db from '../db.js';
import { authenticateToken, requireAdmin, isAdminEmail } from '../middleware/auth.js';
import { HARDCODED_EVENTS } from './events.js';

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

  const byEvent = db
    .prepare('SELECT event_id, COUNT(*) AS n FROM registrations GROUP BY event_id')
    .all()
    .map((r) => ({ eventId: r.event_id, eventName: eventName(r.event_id), count: r.n }))
    .sort((a, b) => b.count - a.count);

  res.json({
    users: one('SELECT COUNT(*) AS n FROM users'),
    onboarded: one('SELECT COUNT(*) AS n FROM users WHERE is_onboarded = 1'),
    registrations: one('SELECT COUNT(*) AS n FROM registrations'),
    teams: one('SELECT COUNT(*) AS n FROM teams'),
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
      `SELECT r.id, r.event_id, r.payment_screenshot_url, r.status, r.created_at,
              u.id AS user_id, u.first_name, u.last_name, u.email, u.phone_number,
              u.id_card_url, u.profile_pic_url, u.is_onboarded,
              t.id AS team_id, t.name AS team_name, t.code AS team_code, t.leader_id
       FROM registrations r
       JOIN users u ON u.id = r.user_id
       LEFT JOIN team_members tm ON tm.user_id = u.id
       LEFT JOIN teams t ON t.id = tm.team_id
       ORDER BY r.created_at DESC`
    )
    .all();

  res.json({
    registrations: rows.map((r) => ({
      id: r.id,
      status: r.status,
      createdAt: r.created_at,
      event: { id: r.event_id, name: eventName(r.event_id) },
      paymentScreenshotUrl: r.payment_screenshot_url,
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
      team: r.team_id
        ? {
            id: r.team_id,
            name: r.team_name,
            code: r.team_code,
            isLeader: r.leader_id === r.user_id,
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
              t.id AS team_id, t.name AS team_name, t.code AS team_code
       FROM users u
       LEFT JOIN registrations r ON r.user_id = u.id
       LEFT JOIN team_members tm ON tm.user_id = u.id
       LEFT JOIN teams t ON t.id = tm.team_id
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
      isOnboarded: Boolean(u.is_onboarded),
      createdAt: u.created_at,
      registration: u.reg_event_id
        ? { eventId: u.reg_event_id, eventName: eventName(u.reg_event_id), status: u.reg_status }
        : null,
      team: u.team_id ? { id: u.team_id, name: u.team_name, code: u.team_code } : null,
    })),
  });
});

/**
 * GET /api/admin/teams
 * Every team with its members and event.
 */
router.get('/teams', (req, res) => {
  const teams = db.prepare('SELECT * FROM teams ORDER BY created_at DESC').all();
  const memberStmt = db.prepare(
    `SELECT u.id, u.first_name, u.last_name, u.email, u.phone_number, tm.joined_at
     FROM team_members tm JOIN users u ON u.id = tm.user_id
     WHERE tm.team_id = ? ORDER BY tm.joined_at`
  );

  res.json({
    teams: teams.map((t) => {
      const members = memberStmt.all(t.id);
      return {
        id: t.id,
        name: t.name,
        code: t.code,
        event: { id: t.event_id, name: eventName(t.event_id) },
        leaderId: t.leader_id,
        createdAt: t.created_at,
        memberCount: members.length,
        maxMembers: 2,
        members: members.map((m) => ({
          id: m.id,
          firstName: m.first_name,
          lastName: m.last_name,
          email: m.email,
          phoneNumber: m.phone_number,
          isLeader: m.id === t.leader_id,
          joinedAt: m.joined_at,
        })),
      };
    }),
  });
});

export default router;
