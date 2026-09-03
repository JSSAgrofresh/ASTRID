import type { GitTaskStatus, PublicTask, TaskValidations } from "@/lib/types";
import { SqliteTaskRepository, type StoredTask, type TaskRepository } from "./db/task-repository";

export type { StoredTask };

/**
 * Server-side task persistence.
 *
 * Backed by SQLite (see `db/connection.ts` and `db/task-repository.ts`) so
 * tasks survive a Next.js server restart. This module is the ONLY place
 * that constructs a `TaskRepository`; every other module (task-runner,
 * task-approval-service, API routes) calls only the five functions below,
 * never a repository or database connection directly — so migrating to
 * Postgres later means writing a new `TaskRepository` and changing the one
 * line below that constructs `repo`, nothing else moves.
 */
const repo: TaskRepository = new SqliteTaskRepository();

export function saveTask(task: StoredTask): StoredTask {
  return repo.save(task);
}

export function getTask(taskId: string): StoredTask | undefined {
  return repo.get(taskId);
}

export function updateTask(taskId: string, patch: Partial<StoredTask>): StoredTask | undefined {
  return repo.update(taskId, patch);
}

/** Explicit allowlist projection (not a destructure-and-omit) so it is
 * obvious at a glance that `workspacePath`/`worktreeDir`/`instruction`
 * never leave this function. */
export function toPublicTask(task: StoredTask): PublicTask {
  return {
    taskId: task.taskId,
    projectId: task.projectId,
    projectName: task.projectName,
    baseBranch: task.baseBranch,
    taskBranch: task.taskBranch,
    filesChanged: task.filesChanged,
    diffStat: task.diffStat,
    diff: task.diff,
    validations: task.validations,
    status: task.status,
    createdAt: task.createdAt,
    approvedAt: task.approvedAt,
    commitSha: task.commitSha,
    pushedAt: task.pushedAt,
    prUrl: task.prUrl,
    errorDetail: task.errorDetail,
  };
}

export function newTaskId(): string {
  return `task-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}

export function emptyValidations(): TaskValidations {
  return {};
}

export type { GitTaskStatus };
