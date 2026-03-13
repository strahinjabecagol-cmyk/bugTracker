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

// Add bug_commits table if it doesn't exist yet
db.exec(`
  CREATE TABLE IF NOT EXISTS bug_commits (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    bug_id       INTEGER NOT NULL REFERENCES bugs(id) ON DELETE CASCADE,
    commit_sha   TEXT    NOT NULL,
    message      TEXT    NOT NULL,
    author       TEXT    NOT NULL,
    committed_at TEXT    NOT NULL,
    url          TEXT    NOT NULL DEFAULT '',
    branch       TEXT    NOT NULL DEFAULT '',
    UNIQUE(bug_id, commit_sha)
  );
`);
// Migrate: add branch column if missing (existing DBs)
try { db.exec(`ALTER TABLE bug_commits ADD COLUMN branch TEXT NOT NULL DEFAULT ''`); } catch { /* already exists */ }

// Add bug_images table if it doesn't exist yet
db.exec(`
  CREATE TABLE IF NOT EXISTS bug_images (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    bug_id     INTEGER NOT NULL REFERENCES bugs(id) ON DELETE CASCADE,
    data_url   TEXT    NOT NULL,
    created_at TEXT    NOT NULL DEFAULT (datetime('now'))
  );
`);

// Add item_links table if it doesn't exist yet
db.exec(`
  CREATE TABLE IF NOT EXISTS item_links (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    bug_id        INTEGER NOT NULL REFERENCES bugs(id) ON DELETE CASCADE,
    linked_bug_id INTEGER NOT NULL REFERENCES bugs(id) ON DELETE CASCADE,
    created_at    TEXT    NOT NULL DEFAULT (datetime('now')),
    UNIQUE(bug_id, linked_bug_id),
    CHECK(bug_id != linked_bug_id)
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

// Add AI assessment columns to bugs if they don't exist yet
try { db.exec(`ALTER TABLE bugs ADD COLUMN ai_explanation TEXT`); } catch { /* already exists */ }
try { db.exec(`ALTER TABLE bugs ADD COLUMN ai_suggested_priority TEXT`); } catch { /* already exists */ }
try { db.exec(`ALTER TABLE bugs ADD COLUMN ai_suggested_severity TEXT`); } catch { /* already exists */ }
try { db.exec(`ALTER TABLE bugs ADD COLUMN ai_assessed_at TEXT`); } catch { /* already exists */ }
try { db.exec(`ALTER TABLE bugs ADD COLUMN ai_tokens_in INTEGER`); } catch { /* already exists */ }
try { db.exec(`ALTER TABLE bugs ADD COLUMN ai_tokens_out INTEGER`); } catch { /* already exists */ }

// AI usage log — one row per assessment call
db.exec(`
  CREATE TABLE IF NOT EXISTS ai_usage_log (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    bug_id     INTEGER NOT NULL REFERENCES bugs(id) ON DELETE CASCADE,
    model      TEXT    NOT NULL,
    tokens_in  INTEGER NOT NULL,
    tokens_out INTEGER NOT NULL,
    created_at TEXT    NOT NULL DEFAULT (datetime('now'))
  );
`);

// AI portfolio assessment log — one row per full portfolio run
db.exec(`
  CREATE TABLE IF NOT EXISTS ai_portfolio_log (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    run_at     TEXT    NOT NULL DEFAULT (datetime('now')),
    model      TEXT    NOT NULL,
    tokens_in  INTEGER NOT NULL,
    tokens_out INTEGER NOT NULL,
    item_count INTEGER NOT NULL,
    project_id INTEGER
  );
`);

// Migration: add project_id to ai_portfolio_log if it doesn't exist yet
try {
  db.exec(`ALTER TABLE ai_portfolio_log ADD COLUMN project_id INTEGER;`);
} catch {
  // column already exists — no-op
}

// AI portfolio results — one row per item per run
db.exec(`
  CREATE TABLE IF NOT EXISTS ai_portfolio_results (
    id                 INTEGER PRIMARY KEY AUTOINCREMENT,
    run_id             INTEGER NOT NULL REFERENCES ai_portfolio_log(id) ON DELETE CASCADE,
    bug_id             INTEGER NOT NULL REFERENCES bugs(id) ON DELETE CASCADE,
    rank               INTEGER NOT NULL,
    suggested_priority TEXT    NOT NULL,
    suggested_severity TEXT    NOT NULL,
    rationale          TEXT    NOT NULL
  );
`);

// Add project_members table if it doesn't exist yet
db.exec(`
  CREATE TABLE IF NOT EXISTS project_members (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    user_id    INTEGER NOT NULL REFERENCES users(id)    ON DELETE CASCADE,
    created_at TEXT    NOT NULL DEFAULT (datetime('now')),
    UNIQUE(project_id, user_id)
  );
`);

// integration_profiles — one row per configured VCS integration (GitHub, GitLab, Bitbucket)
// base_url: host root (required for self-hosted GitLab, e.g. https://gitlab.company.com;
//           optional for GitHub/Bitbucket which have fixed API endpoints)
// repo:     identifies the repository within the platform —
//           GitHub/Bitbucket: "owner/repo", GitLab: numeric project ID or "namespace/path"
// access_token: stored in plaintext for now — see #204 for encryption task
db.exec(`
  CREATE TABLE IF NOT EXISTS integration_profiles (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    name         TEXT    NOT NULL,
    platform     TEXT    NOT NULL CHECK(platform IN ('github', 'gitlab', 'bitbucket')),
    base_url     TEXT    NOT NULL DEFAULT '',
    repo         TEXT    NOT NULL,
    access_token TEXT    NOT NULL,
    created_at   TEXT    NOT NULL DEFAULT (datetime('now')),
    updated_at   TEXT    NOT NULL DEFAULT (datetime('now'))
  );
`);

// project_integrations — binds a project to one integration profile
// ON DELETE CASCADE on profile: if profile is deleted the binding is removed
// (enforced at API layer first with a 409 check — this is a safety net)
db.exec(`
  CREATE TABLE IF NOT EXISTS project_integrations (
    project_id INTEGER PRIMARY KEY REFERENCES projects(id) ON DELETE CASCADE,
    profile_id INTEGER NOT NULL    REFERENCES integration_profiles(id) ON DELETE CASCADE
  );
`);

// Seed initial membership — all existing users become members of all existing projects
// so nobody is locked out after the migration runs for the first time
db.exec(`
  INSERT OR IGNORE INTO project_members (project_id, user_id)
  SELECT p.id, u.id FROM projects p CROSS JOIN users u
  WHERE u.email != 'deleted@system';
`);

// System "Deleted User" — comments and bugs from deleted users are reassigned here
db.prepare(`
  INSERT OR IGNORE INTO users (name, email, role, password_hash)
  VALUES ('Deleted User', 'deleted@system', 'developer', NULL)
`).run();

export const DELETED_USER_ID = (
  db.prepare(`SELECT id FROM users WHERE email = 'deleted@system'`).get() as { id: number }
).id;

export default db;
