import jwt from 'jsonwebtoken';
import db from '../db.js';

export const JWT_SECRET = process.env.JWT_SECRET || 'zyverse_super_secret_jwt_key_2026';

// Comma-separated list of admin emails, e.g. ADMIN_EMAILS="a@x.com, b@x.com".
// Read at call time so it doesn't matter whether .env loaded before this module.
export function isAdminEmail(email) {
  if (!email) return false;
  const allowed = (process.env.ADMIN_EMAILS || '')
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  return allowed.includes(String(email).toLowerCase());
}

/** Use after authenticateToken — 403s anyone whose email isn't in ADMIN_EMAILS. */
export function requireAdmin(req, res, next) {
  if (!req.user || !isAdminEmail(req.user.email)) {
    return res.status(403).json({ error: 'Admin access required.' });
  }
  next();
}

export function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required. Please log in.' });
  }

  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid or expired token.' });
    }

    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(decoded.id);
    if (!user) {
      return res.status(404).json({ error: 'User account not found.' });
    }

    req.user = user;
    next();
  });
}
