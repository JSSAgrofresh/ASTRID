import { DatabaseSync } from "node:sqlite";
import { mkdirSync } from "node:fs";
import path from "node:path";

/**
 * Single server-side SQLite connection for SANAI's own persisted state
 * (edit tasks — see `task-repository.ts`; registered projects — see
 * `project-repository.ts`). Only ever imported
 * from other modules under `lib/server/`, never from a Client Component —
 * and `node:sqlite` is a Node built-in, so nothing here can end up in a
 * browser bundle.
 *
 * The database file is deliberately a sibling of `WORKTREES_ROOT` (see
 * `../workspace.ts`) — outside `ALLOWED_PROJECTS_ROOT` and outside this
 * repo entirely, so it can never end up inside a Git repo, `public/`, or
 * the Next.js build output by construction, not merely by `.gitignore`
 * convention. Override with `SANAI_DB_PATH` (e.g. for tests) if needed.
 */
const DEFAULT_DB_PATH = "/home/kokes/astrid/data/astrid.db";
export const DB_PATH = process.env.SANAI_DB_PATH || DEFAULT_DB_PATH;

const SCHEMA = `
CREATE TABLE IF NOT EXISTS tasks (
  task_id        TEXT PRIMARY KEY,
  project_id     TEXT NOT NULL,
  project_name   TEXT NOT NULL,
  base_branch    TEXT NOT NULL,
  task_branch    TEXT NOT NULL,
  workspace_path TEXT NOT NULL,
  worktree_dir   TEXT NOT NULL,
  instruction    TEXT NOT NULL,
  files_changed  TEXT NOT NULL,
  diff_stat      TEXT NOT NULL,
  diff           TEXT NOT NULL,
  validations    TEXT NOT NULL,
  status         TEXT NOT NULL,
  created_at     TEXT NOT NULL,
  approved_at    TEXT,
  commit_sha     TEXT,
  pushed_at      TEXT,
  pr_url         TEXT,
  error_detail   TEXT
);

CREATE TABLE IF NOT EXISTS projects (
  project_id     TEXT PRIMARY KEY,
  owner          TEXT NOT NULL,
  repo_name      TEXT NOT NULL,
  full_name      TEXT NOT NULL UNIQUE,
  display_name   TEXT NOT NULL,
  workspace_path TEXT NOT NULL,
  default_branch TEXT NOT NULL,
  visibility     TEXT NOT NULL,
  status         TEXT NOT NULL,
  created_at     TEXT NOT NULL,
  updated_at     TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS conversations (
  conversation_id TEXT PRIMARY KEY,
  project_id      TEXT,
  title           TEXT NOT NULL,
  status          TEXT NOT NULL,
  created_at      TEXT NOT NULL,
  updated_at      TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS messages (
  message_id      TEXT PRIMARY KEY,
  conversation_id TEXT NOT NULL REFERENCES conversations(conversation_id),
  role            TEXT NOT NULL,
  content         TEXT NOT NULL,
  type            TEXT,
  created_at      TEXT NOT NULL,
  metadata        TEXT
);

CREATE INDEX IF NOT EXISTS idx_messages_conversation_created
  ON messages(conversation_id, created_at);
`;

let db: DatabaseSync | undefined;

/** Opens (once per process) and migrates the SQLite database. */
export function getDb(): DatabaseSync {
  if (db) return db;
  mkdirSync(path.dirname(DB_PATH), { recursive: true });
  db = new DatabaseSync(DB_PATH);
  db.exec("PRAGMA journal_mode = WAL;");
  // Several Next.js build/dev worker processes can open this same file at
  // once (confirmed live: "database is locked" during `next build`'s
  // parallel page-data collection). WAL alone doesn't wait out a
  // momentary writer lock — busy_timeout makes SQLite retry for up to 5s
  // instead of failing immediately.
  db.exec("PRAGMA busy_timeout = 5000;");
  db.exec(SCHEMA);
  return db;
}
