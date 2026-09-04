import type { ProjectRegistryStatus, ProjectVisibility, PublicProject } from "@/lib/types";
import { getDb } from "./connection";

/**
 * `StoredProject` extends the client-safe `PublicProject` with the one
 * filesystem path a registered project needs internally. That field is the
 * entire reason this type lives under `lib/server/` and not
 * `lib/types.ts` — `project-store.ts`'s `toPublicProject` is the only
 * place it is ever stripped away, and every API route must send that
 * projection to the client, never a raw `StoredProject`.
 */
export interface StoredProject extends PublicProject {
  workspacePath: string;
}

/**
 * Storage boundary, same shape as `task-repository.ts`'s `TaskRepository`:
 * `project-store.ts` is the only module that constructs a
 * `ProjectRepository`. Migrating SQLite to Postgres later means writing a
 * new class that implements this interface and changing the one line in
 * `project-store.ts` that instantiates it.
 */
export interface ProjectRepository {
  list(): StoredProject[];
  get(projectId: string): StoredProject | undefined;
  getByFullName(fullName: string): StoredProject | undefined;
  save(project: StoredProject): StoredProject;
}

interface ProjectRow {
  project_id: string;
  owner: string;
  repo_name: string;
  full_name: string;
  display_name: string;
  workspace_path: string;
  default_branch: string;
  visibility: string;
  status: string;
  created_at: string;
  updated_at: string;
}

function rowToProject(row: ProjectRow): StoredProject {
  return {
    projectId: row.project_id,
    owner: row.owner,
    repoName: row.repo_name,
    fullName: row.full_name,
    displayName: row.display_name,
    workspacePath: row.workspace_path,
    defaultBranch: row.default_branch,
    visibility: row.visibility as ProjectVisibility,
    status: row.status as ProjectRegistryStatus,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

const UPSERT_SQL = `
  INSERT INTO projects (
    project_id, owner, repo_name, full_name, display_name, workspace_path,
    default_branch, visibility, status, created_at, updated_at
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  ON CONFLICT(project_id) DO UPDATE SET
    owner = excluded.owner,
    repo_name = excluded.repo_name,
    full_name = excluded.full_name,
    display_name = excluded.display_name,
    workspace_path = excluded.workspace_path,
    default_branch = excluded.default_branch,
    visibility = excluded.visibility,
    status = excluded.status,
    updated_at = excluded.updated_at
`;

/** SQLite-backed `ProjectRepository`. See module docs above for the migration seam. */
export class SqliteProjectRepository implements ProjectRepository {
  list(): StoredProject[] {
    const rows = getDb().prepare("SELECT * FROM projects ORDER BY display_name ASC").all() as unknown as ProjectRow[];
    return rows.map(rowToProject);
  }

  get(projectId: string): StoredProject | undefined {
    const row = getDb().prepare("SELECT * FROM projects WHERE project_id = ?").get(projectId) as
      | ProjectRow
      | undefined;
    return row ? rowToProject(row) : undefined;
  }

  getByFullName(fullName: string): StoredProject | undefined {
    const row = getDb()
      .prepare("SELECT * FROM projects WHERE full_name = ? COLLATE NOCASE")
      .get(fullName) as ProjectRow | undefined;
    return row ? rowToProject(row) : undefined;
  }

  save(project: StoredProject): StoredProject {
    getDb()
      .prepare(UPSERT_SQL)
      .run(
        project.projectId,
        project.owner,
        project.repoName,
        project.fullName,
        project.displayName,
        project.workspacePath,
        project.defaultBranch,
        project.visibility,
        project.status,
        project.createdAt,
        project.updatedAt,
      );
    return project;
  }
}
