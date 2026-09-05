import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ensure db directory exists (mounted as a volume in Docker)
const dbDir = process.env.DATA_DIR || path.join(__dirname, 'data');
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const dbPath = path.join(dbDir, 'database.sqlite');
const db = new Database(dbPath);

// Enable WAL mode & foreign key constraints
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// Initialize database schema
export function initDb() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      google_id TEXT UNIQUE NOT NULL,
      email TEXT NOT NULL,
      first_name TEXT,
      last_name TEXT,
      phone_number TEXT,
      id_card_url TEXT,
      profile_pic_url TEXT,
      college TEXT,
      -- 'solo' | 'team'. Chosen at onboarding and never changed afterwards.
      mode TEXT,
      is_onboarded INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- Team mode: the registrar enters their teammate's details here. The
    -- teammate has no account and never logs in — this row is the whole record.
    CREATE TABLE IF NOT EXISTS teammates (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER UNIQUE NOT NULL,
      first_name TEXT NOT NULL,
      last_name TEXT NOT NULL,
      phone_number TEXT NOT NULL,
      email TEXT NOT NULL,
      college TEXT,
      -- Optional: the college ID card / profile picture upload was dropped
      -- from the registration form.
      id_card_url TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS registrations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER UNIQUE NOT NULL,
      event_id TEXT NOT NULL,
      payment_screenshot_url TEXT NOT NULL,
      transaction_id TEXT,
      status TEXT DEFAULT 'pending',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS teams (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      event_id TEXT NOT NULL,
      code TEXT UNIQUE NOT NULL,
      leader_id INTEGER NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (leader_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS team_members (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      team_id INTEGER NOT NULL,
      user_id INTEGER UNIQUE NOT NULL,
      joined_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );
  `);

  // ── Migrations ───────────────────────────────────────────────────────────
  // Databases created before the payment-reference field exist in the wild
  // (the Docker volume survives rebuilds), and CREATE TABLE IF NOT EXISTS is a
  // no-op on them. Add the column only when it is genuinely missing.
  const regColumns = db.prepare('PRAGMA table_info(registrations)').all().map((c) => c.name);
  if (!regColumns.includes('transaction_id')) {
    db.exec('ALTER TABLE registrations ADD COLUMN transaction_id TEXT');
    console.log('↳ migration: added registrations.transaction_id');
  }

  const userColumns = db.prepare('PRAGMA table_info(users)').all().map((c) => c.name);
  if (!userColumns.includes('mode')) {
    db.exec('ALTER TABLE users ADD COLUMN mode TEXT');
    console.log('↳ migration: added users.mode');
  }
  if (!userColumns.includes('college')) {
    db.exec('ALTER TABLE users ADD COLUMN college TEXT');
    console.log('↳ migration: added users.college');
  }

  const teammateInfo = db.prepare('PRAGMA table_info(teammates)').all();
  const teammateColumns = teammateInfo.map((c) => c.name);
  if (teammateColumns.length && !teammateColumns.includes('college')) {
    db.exec('ALTER TABLE teammates ADD COLUMN college TEXT');
    console.log('↳ migration: added teammates.college');
  }

  // The college ID card upload used to be required (id_card_url TEXT NOT NULL).
  // It's now optional, but SQLite can't drop a NOT NULL constraint in place —
  // rebuild the table around a nullable column, copying every existing row
  // across so no data is lost.
  const idCardCol = teammateInfo.find((c) => c.name === 'id_card_url');
  if (idCardCol && idCardCol.notnull) {
    db.pragma('foreign_keys = OFF');
    db.transaction(() => {
      db.exec(`
        CREATE TABLE teammates_new (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER UNIQUE NOT NULL,
          first_name TEXT NOT NULL,
          last_name TEXT NOT NULL,
          phone_number TEXT NOT NULL,
          email TEXT NOT NULL,
          college TEXT,
          id_card_url TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        );
        INSERT INTO teammates_new (id, user_id, first_name, last_name, phone_number, email, college, id_card_url, created_at, updated_at)
          SELECT id, user_id, first_name, last_name, phone_number, email, college, id_card_url, created_at, updated_at FROM teammates;
        DROP TABLE teammates;
        ALTER TABLE teammates_new RENAME TO teammates;
      `);
    })();
    db.pragma('foreign_keys = ON');
    console.log('↳ migration: relaxed teammates.id_card_url to nullable (no rows lost)');
  }

  // A bank reference pays for exactly one registration — this is what stops the
  // same UTR (and the same screenshot) being reused from a second account.
  // Legacy rows hold NULL, and SQLite lets NULL repeat under a UNIQUE index.
  db.exec(
    'CREATE UNIQUE INDEX IF NOT EXISTS idx_registrations_transaction_id ON registrations(transaction_id)'
  );

  console.log('✅ SQLite Database initialized successfully.');
}

export default db;
