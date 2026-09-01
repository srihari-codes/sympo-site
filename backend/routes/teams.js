import express from 'express';
import crypto from 'crypto';
import db from '../db.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// Helper to generate 6-character uppercase secret code
function generateTeamCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Exclude ambiguous chars like 0, O, 1, I
  let code = '';
  const bytes = crypto.randomBytes(6);
  for (let i = 0; i < 6; i++) {
    code += chars[bytes[i] % chars.length];
  }
  return code;
}

/**
 * POST /api/teams/create
 * Creates a new team for the user's registered event and generates a secret code.
 */
router.post('/create', authenticateToken, (req, res) => {
  try {
    const user = req.user;
    const { name } = req.body;

    if (!name || name.trim().length === 0) {
      return res.status(400).json({ error: 'Team name is required.' });
    }

    // 1. User must be registered for an event
    const registration = db.prepare('SELECT * FROM registrations WHERE user_id = ?').get(user.id);
    if (!registration) {
      return res.status(400).json({ error: 'You must register for an event before creating a team.' });
    }

    // 2. User must not already be in a team
    const existingMembership = db.prepare('SELECT * FROM team_members WHERE user_id = ?').get(user.id);
    if (existingMembership) {
      return res.status(400).json({ error: 'You are already a member of a team. Please leave your current team first.' });
    }

    // 3. Generate unique secret code
    let code;
    let isUnique = false;
    let attempts = 0;
    while (!isUnique && attempts < 10) {
      code = generateTeamCode();
      const existingTeam = db.prepare('SELECT id FROM teams WHERE code = ?').get(code);
      if (!existingTeam) {
        isUnique = true;
      }
      attempts++;
    }

    if (!isUnique) {
      return res.status(500).json({ error: 'Failed to generate unique team code. Please try again.' });
    }

    // Use transaction for atomic team creation & leader member insertion
    const createTeamTx = db.transaction(() => {
      const teamInsert = db.prepare(`
        INSERT INTO teams (name, event_id, code, leader_id)
        VALUES (?, ?, ?, ?)
      `).run(name.trim(), registration.event_id, code, user.id);

      const teamId = teamInsert.lastInsertRowid;

      db.prepare(`
        INSERT INTO team_members (team_id, user_id)
        VALUES (?, ?)
      `).run(teamId, user.id);

      return teamId;
    });

    const teamId = createTeamTx();

    const team = db.prepare('SELECT * FROM teams WHERE id = ?').get(teamId);
    const members = db.prepare(`
      SELECT u.id, u.first_name, u.last_name, u.email, tm.joined_at
      FROM team_members tm
      JOIN users u ON tm.user_id = u.id
      WHERE tm.team_id = ?
    `).all(teamId);

    res.status(201).json({
      message: 'Team created successfully!',
      team: {
        id: team.id,
        name: team.name,
        eventId: team.event_id,
        code: team.code,
        leaderId: team.leader_id,
        isLeader: true,
        members,
        memberCount: members.length,
        maxMembers: 2,
      },
    });
  } catch (error) {
    console.error('Create team error:', error);
    res.status(500).json({ error: 'Failed to create team: ' + error.message });
  }
});

/**
 * POST /api/teams/join
 * Joins a team using its 6-character secret code (max 2 members constraint).
 */
router.post('/join', authenticateToken, (req, res) => {
  try {
    const user = req.user;
    const { code } = req.body;

    if (!code || code.trim().length === 0) {
      return res.status(400).json({ error: 'Secret team code is required.' });
    }

    const cleanCode = code.trim().toUpperCase();

    // 1. User must be registered for an event
    const registration = db.prepare('SELECT * FROM registrations WHERE user_id = ?').get(user.id);
    if (!registration) {
      return res.status(400).json({ error: 'You must register for an event before joining a team.' });
    }

    // 2. User must not already be in a team
    const existingMembership = db.prepare('SELECT * FROM team_members WHERE user_id = ?').get(user.id);
    if (existingMembership) {
      return res.status(400).json({ error: 'You are already in a team. Leave your current team to join another.' });
    }

    // 3. Find team by code
    const team = db.prepare('SELECT * FROM teams WHERE code = ?').get(cleanCode);
    if (!team) {
      return res.status(404).json({ error: 'Invalid team secret code. Team not found.' });
    }

    // 4. Ensure event matches
    if (team.event_id !== registration.event_id) {
      return res.status(400).json({
        error: 'This team is registered for a different event than the one you registered for.',
      });
    }

    // 5. Enforce Max 2 members limit per team
    const currentMembers = db.prepare('SELECT * FROM team_members WHERE team_id = ?').all(team.id);
    if (currentMembers.length >= 2) {
      return res.status(400).json({
        error: 'This team is already full! Maximum team size is 2 members for all events.',
      });
    }

    // 6. Join team
    db.prepare(`
      INSERT INTO team_members (team_id, user_id)
      VALUES (?, ?)
    `).run(team.id, user.id);

    const updatedMembers = db.prepare(`
      SELECT u.id, u.first_name, u.last_name, u.email, tm.joined_at
      FROM team_members tm
      JOIN users u ON tm.user_id = u.id
      WHERE tm.team_id = ?
    `).all(team.id);

    res.json({
      message: 'Successfully joined team!',
      team: {
        id: team.id,
        name: team.name,
        eventId: team.event_id,
        code: team.code,
        leaderId: team.leader_id,
        isLeader: team.leader_id === user.id,
        members: updatedMembers,
        memberCount: updatedMembers.length,
        maxMembers: 2,
      },
    });
  } catch (error) {
    console.error('Join team error:', error);
    res.status(500).json({ error: 'Failed to join team: ' + error.message });
  }
});

/**
 * GET /api/teams/my-team
 * Returns current user's team details
 */
router.get('/my-team', authenticateToken, (req, res) => {
  const membership = db.prepare(`
    SELECT tm.*, t.name as team_name, t.code as team_code, t.event_id as team_event_id, t.leader_id
    FROM team_members tm
    JOIN teams t ON tm.team_id = t.id
    WHERE tm.user_id = ?
  `).get(req.user.id);

  if (!membership) {
    return res.json({ team: null });
  }

  const members = db.prepare(`
    SELECT u.id, u.first_name, u.last_name, u.email, tm.joined_at
    FROM team_members tm
    JOIN users u ON tm.user_id = u.id
    WHERE tm.team_id = ?
  `).all(membership.team_id);

  res.json({
    team: {
      id: membership.team_id,
      name: membership.team_name,
      eventId: membership.team_event_id,
      code: membership.team_code,
      leaderId: membership.leader_id,
      isLeader: membership.leader_id === req.user.id,
      members,
      memberCount: members.length,
      maxMembers: 2,
    },
  });
});

/**
 * POST /api/teams/leave
 * Leaves or disbands current team
 */
router.post('/leave', authenticateToken, (req, res) => {
  try {
    const user = req.user;

    const membership = db.prepare(`
      SELECT tm.*, t.leader_id
      FROM team_members tm
      JOIN teams t ON tm.team_id = t.id
      WHERE tm.user_id = ?
    `).get(user.id);

    if (!membership) {
      return res.status(400).json({ error: 'You are not currently in any team.' });
    }

    if (membership.leader_id === user.id) {
      // Leader disbands team (deletes team & members due to ON DELETE CASCADE)
      db.prepare('DELETE FROM teams WHERE id = ?').run(membership.team_id);
      return res.json({ message: 'Team disbanded successfully.' });
    } else {
      // Member leaves team
      db.prepare('DELETE FROM team_members WHERE user_id = ?').run(user.id);
      return res.json({ message: 'Left team successfully.' });
    }
  } catch (error) {
    console.error('Leave team error:', error);
    res.status(500).json({ error: 'Failed to leave team: ' + error.message });
  }
});

export default router;
