import type { GitTaskStatus, PublicTask, TaskValidations } from "@/lib/types";
import { getDb } from "./connection";

/**
 * `StoredTask` extends the client-safe `PublicTask` with the filesystem
 * paths and raw instruction a task needs internally. Those fields are the
 * entire reason this type lives under `lib/server/` and not
 * `lib/types.ts` — `task-store.ts`'s `toPublicTask` is the only place they
 * are ever stripped away, and every API route must send that projection to
 * the client, never a raw `StoredTask`.
 */
export interface StoredTask extends PublicTask {
  workspacePath: string;
  worktreeDir: string;
  instruction: string;
}

/**
 * Storage boundary: `task-store.ts` is the only module that constructs a
 * `TaskRepository` or imports this file. Everything else (task-runner,
 * task-approval-service, API routes) calls only `task-store.ts`'s
 * functions. Migrating SQLite to Postgres later means writing a new class
 * that implements this interface and changing the one line in
 * `task-store.ts` that instantiates it — nothing else in the codebase, and
 * no client-facing contract, moves.
 */
export interface TaskRepository {
  save(task: StoredTask): StoredTask;
  get(taskId: string): StoredTask | undefined;
  update(taskId: string, patch: Partial<StoredTask>): StoredTask | undefined;
}

interface TaskRow {
  task_id: string;
  project_id: string;
  project_name: string;
  base_branch: string;
  task_branch: string;
  workspace_path: string;
  worktree_dir: string;
  instruction: string;
  files_changed: string;
  diff_stat: string;
  diff: string;
  validations: string;
  status: string;
  created_at: string;
  approved_at: string | null;
  commit_sha: string | null;
  pushed_at: string | null;
  pr_url: string | null;
  error_detail: string | null;
}

function rowToTask(row: TaskRow): StoredTask {
  return {
    taskId: row.task_id,
    projectId: row.project_id,
    projectName: row.project_name,
    baseBranch: row.base_branch,
    taskBranch: row.task_branch,
    workspacePath: row.workspace_path,
    worktreeDir: row.worktree_dir,
    instruction: row.instruction,
    filesChanged: JSON.parse(row.files_changed) as string[],
    diffStat: row.diff_stat,
    diff: row.diff,
    validations: JSON.parse(row.validations) as TaskValidations,
    status: row.status as GitTaskStatus,
    createdAt: row.created_at,
    approvedAt: row.approved_at ?? undefined,
    commitSha: row.commit_sha ?? undefined,
    pushedAt: row.pushed_at ?? undefined,
    prUrl: row.pr_url ?? undefined,
    errorDetail: row.error_detail ?? undefined,
  };
}

/** SQLite-backed `TaskRepository`. See module docs above for the migration seam. */
export class SqliteTaskRepository implements TaskRepository {
  save(task: StoredTask): StoredTask {
    getDb()
      .prepare(
        `INSERT INTO tasks (
          task_id, project_id, project_name, base_branch, task_branch,
          workspace_path, worktree_dir, instruction, files_changed, diff_stat,
          diff, validations, status, created_at, approved_at, commit_sha,
          pushed_at, pr_url, error_detail
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(task_id) DO UPDATE SET
          project_id = excluded.project_id,
          project_name = excluded.project_name,
          base_branch = excluded.base_branch,
          task_branch = excluded.task_branch,
          workspace_path = excluded.workspace_path,
          worktree_dir = excluded.worktree_dir,
          instruction = excluded.instruction,
          files_changed = excluded.files_changed,
          diff_stat = excluded.diff_stat,
          diff = excluded.diff,
          validations = excluded.validations,
          status = excluded.status,
          created_at = excluded.created_at,
          approved_at = excluded.approved_at,
          commit_sha = excluded.commit_sha,
          pushed_at = excluded.pushed_at,
          pr_url = excluded.pr_url,
          error_detail = excluded.error_detail`,
      )
      .run(
        task.taskId,
        task.projectId,
        task.projectName,
        task.baseBranch,
        task.taskBranch,
        task.workspacePath,
        task.worktreeDir,
        task.instruction,
        JSON.stringify(task.filesChanged),
        task.diffStat,
        task.diff,
        JSON.stringify(task.validations),
        task.status,
        task.createdAt,
        task.approvedAt ?? null,
        task.commitSha ?? null,
        task.pushedAt ?? null,
        task.prUrl ?? null,
        task.errorDetail ?? null,
      );
    return task;
  }

  get(taskId: string): StoredTask | undefined {
    const row = getDb().prepare("SELECT * FROM tasks WHERE task_id = ?").get(taskId) as TaskRow | undefined;
    return row ? rowToTask(row) : undefined;
  }

  update(taskId: string, patch: Partial<StoredTask>): StoredTask | undefined {
    const existing = this.get(taskId);
    if (!existing) return undefined;
    return this.save({ ...existing, ...patch });
  }
}
