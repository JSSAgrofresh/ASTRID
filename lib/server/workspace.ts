import { existsSync, realpathSync, statSync } from "node:fs";
import path from "node:path";
import { PROJECT_WORKSPACES } from "./project-workspaces";

/**
 * Resolves `projectId → workspacePath` and validates the result before
 * ASTRID ever hands a path to OpenClaw. This is the fix for the
 * `<illegal path>` failure: previously nothing told OpenClaw where the
 * selected project actually lives on disk, so the model had to guess a
 * path itself when it tried to inspect the repo — and sometimes guessed
 * wrong. Now the server resolves and validates a real, allowlisted path
 * and puts it in the prompt explicitly.
 */

const ALLOWED_PROJECTS_ROOT = "/home/kokes/astrid/projects";

export type WorkspaceResolutionErrorKind =
  | "unknown_project"
  | "not_found"
  | "not_a_directory"
  | "outside_allowed_root";

export interface ResolvedWorkspace {
  projectId: string;
  workspacePath: string;
}

export type WorkspaceResolution =
  | { ok: true; workspace: ResolvedWorkspace }
  | { ok: false; kind: WorkspaceResolutionErrorKind; detail: string };

/**
 * Validates a single allowlist entry's path. Every check runs on the
 * *resolved* (symlink-free, `..`-free) path, so path traversal segments in
 * the source string can never survive to the containment check — but the
 * source here is always our own static `PROJECT_WORKSPACES` list, never
 * client input, so this is defense-in-depth rather than the primary
 * boundary (the primary boundary is that the client can only ever send a
 * `projectId` slug, never a path).
 */
function checkWorkspacePath(
  projectId: string,
  rawPath: string,
): WorkspaceResolution {
  if (!existsSync(rawPath)) {
    return {
      ok: false,
      kind: "not_found",
      detail: `El workspace configurado para "${projectId}" no existe en disco: ${rawPath}`,
    };
  }

  let resolved: string;
  try {
    resolved = realpathSync(rawPath);
  } catch (error) {
    return {
      ok: false,
      kind: "not_found",
      detail: `No se pudo resolver el workspace de "${projectId}": ${error instanceof Error ? error.message : String(error)}`,
    };
  }

  let stat;
  try {
    stat = statSync(resolved);
  } catch (error) {
    return {
      ok: false,
      kind: "not_found",
      detail: `No se pudo leer el workspace de "${projectId}": ${error instanceof Error ? error.message : String(error)}`,
    };
  }

  if (!stat.isDirectory()) {
    return {
      ok: false,
      kind: "not_a_directory",
      detail: `El workspace de "${projectId}" no es un directorio: ${resolved}`,
    };
  }

  // Containment check: the resolved (symlink-free) path must sit strictly
  // inside ALLOWED_PROJECTS_ROOT. path.relative + this pair of checks is
  // the standard safe way to test containment — it rejects `..`-escapes,
  // sibling-directory prefix collisions (e.g. "/home/kokes/astrid/projects-evil"),
  // and anything outside the tree entirely (which already covers /mnt/c
  // and every other filesystem outside this workspace root).
  const relative = path.relative(ALLOWED_PROJECTS_ROOT, resolved);
  const isContained = relative !== "" && !relative.startsWith("..") && !path.isAbsolute(relative);
  if (!isContained) {
    return {
      ok: false,
      kind: "outside_allowed_root",
      detail: `El workspace de "${projectId}" queda fuera de ${ALLOWED_PROJECTS_ROOT}: ${resolved}`,
    };
  }

  return { ok: true, workspace: { projectId, workspacePath: resolved } };
}

/**
 * Looks up `projectId` in the server-only allowlist and validates its
 * workspace. Returns `{ok:false}` — never throws — so callers can turn
 * this into a clear, non-leaky user-facing error.
 */
export function resolveProjectWorkspace(projectId: string): WorkspaceResolution {
  const entry = PROJECT_WORKSPACES.find((p) => p.projectId === projectId);
  if (!entry) {
    return {
      ok: false,
      kind: "unknown_project",
      detail: `projectId desconocido o no permitido: "${projectId}"`,
    };
  }

  return checkWorkspacePath(entry.projectId, entry.workspacePath);
}

/**
 * Root directory for isolated per-task Git worktrees — deliberately
 * outside `ALLOWED_PROJECTS_ROOT` (a sibling of `projects/`), so an edit
 * task's worktree can never collide with or shadow a real project
 * directory. Only `task-runner.ts` computes paths under this root, and
 * only from a server-generated `taskId` — never from client input.
 */
export const WORKTREES_ROOT = "/home/kokes/astrid/worktrees";

/** Deterministic worktree path for one edit task: `<root>/<projectId>/<taskId>`. */
export function getTaskWorktreePath(projectId: string, taskId: string): string {
  return path.join(WORKTREES_ROOT, projectId, taskId);
}
