import Database from 'better-sqlite3';
import path from 'path';

const DB_PATH = path.join(process.cwd(), 'bugtracker.db');

const db = new Database(DB_PATH);

// Enable WAL mode for better performance
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    name       TEXT    NOT NULL,
    email      TEXT    NOT NULL UNIQUE,
    role       TEXT    NOT NULL CHECK(role IN ('admin', 'developer', 'tester')),
    created_at TEXT    NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS projects (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    name        TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    created_at  TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS bugs (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    project_id  INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    title       TEXT    NOT NULL,
    description TEXT    NOT NULL DEFAULT '',
    status      TEXT    NOT NULL DEFAULT 'open'
                        CHECK(status IN ('open', 'in_progress', 'resolved', 'closed')),
    priority    TEXT    NOT NULL DEFAULT 'medium'
                        CHECK(priority IN ('low', 'medium', 'high', 'critical')),
    severity    TEXT    NOT NULL DEFAULT 'major'
                        CHECK(severity IN ('minor', 'major', 'critical', 'blocker')),
    reporter_id INTEGER NOT NULL REFERENCES users(id),
    assignee_id INTEGER          REFERENCES users(id),
    created_at  TEXT    NOT NULL DEFAULT (datetime('now')),
    updated_at  TEXT    NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS comments (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    bug_id     INTEGER NOT NULL REFERENCES bugs(id) ON DELETE CASCADE,
    user_id    INTEGER NOT NULL REFERENCES users(id),
    content    TEXT    NOT NULL,
    created_at TEXT    NOT NULL DEFAULT (datetime('now'))
  );
`);

// Add bug_images table if it doesn't exist yet
db.exec(`
  CREATE TABLE IF NOT EXISTS bug_images (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    bug_id     INTEGER NOT NULL REFERENCES bugs(id) ON DELETE CASCADE,
    data_url   TEXT    NOT NULL,
    created_at TEXT    NOT NULL DEFAULT (datetime('now'))
  );
`);

// Add password_hash column if it doesn't exist yet (safe migration)
try {
  db.exec(`ALTER TABLE users ADD COLUMN password_hash TEXT`);
} catch {
  // column already exists — ignore
}

// Add type column to bugs if it doesn't exist yet (safe migration)
try {
  db.exec(`ALTER TABLE bugs ADD COLUMN type TEXT NOT NULL DEFAULT 'bug' CHECK(type IN ('bug', 'task'))`);
} catch {
  // column already exists — ignore
}

// System "Deleted User" — comments and bugs from deleted users are reassigned here
db.prepare(`
  INSERT OR IGNORE INTO users (name, email, role, password_hash)
  VALUES ('Deleted User', 'deleted@system', 'developer', NULL)
`).run();

export const DELETED_USER_ID = (
  db.prepare(`SELECT id FROM users WHERE email = 'deleted@system'`).get() as { id: number }
).id;

export default db;
