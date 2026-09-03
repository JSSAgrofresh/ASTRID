import { DatabaseSync } from "node:sqlite";
import { mkdirSync } from "node:fs";
import path from "node:path";

/**
 * Single server-side SQLite connection for ASTRID's own persisted state
 * (currently: edit tasks — see `task-repository.ts`). Only ever imported
 * from other modules under `lib/server/`, never from a Client Component —
 * and `node:sqlite` is a Node built-in, so nothing here can end up in a
 * browser bundle.
 *
 * The database file is deliberately a sibling of `WORKTREES_ROOT` (see
 * `../workspace.ts`) — outside `ALLOWED_PROJECTS_ROOT` and outside this
 * repo entirely, so it can never end up inside a Git repo, `public/`, or
 * the Next.js build output by construction, not merely by `.gitignore`
 * convention. Override with `ASTRID_DB_PATH` (e.g. for tests) if needed.
 */
const DEFAULT_DB_PATH = "/home/kokes/astrid/data/astrid.db";
export const DB_PATH = process.env.ASTRID_DB_PATH || DEFAULT_DB_PATH;

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
`;

let db: DatabaseSync | undefined;

/** Opens (once per process) and migrates the SQLite database. */
export function getDb(): DatabaseSync {
  if (db) return db;
  mkdirSync(path.dirname(DB_PATH), { recursive: true });
  db = new DatabaseSync(DB_PATH);
  db.exec("PRAGMA journal_mode = WAL;");
  db.exec(SCHEMA);
  return db;
}
