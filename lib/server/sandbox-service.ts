import { execFile } from "node:child_process";
import { unlinkSync } from "node:fs";
import path from "node:path";
import * as git from "./git-service";

/**
 * Points OpenClaw's sandboxed "developer" agent (Docker-backed, configured
 * out-of-band via `openclaw config set agents.entries.developer.*` — see
 * README/docker/developer-sandbox) at exactly one task's worktree before
 * `task-runner.ts` asks it to make an edit.
 *
 * Why this exists: OpenClaw's per-agent `workspace` is a single static
 * path (confirmed against the installed OpenClaw docs — there is no
 * per-session/per-task workspace override), but ANAI creates a brand
 * new worktree per task. So immediately before each edit turn, ANAI
 * repoints "developer"'s workspace at that task's worktree and forces its
 * Docker container to be recreated (`sandbox recreate`) so the container
 * actually remounts the new path instead of reusing a stale one from a
 * previous task.
 *
 * Concurrency note: this only works because ANAI runs one edit task at
 * a time today (see `task-runner.ts`) — "developer" is a single shared
 * agent identity, so two tasks racing this function would fight over the
 * same workspace pointer. Not safe to parallelize without giving each
 * concurrent task its own agent identity.
 */

export const DEVELOPER_AGENT_ID = "developer";

/**
 * In-container mount point of the task worktree, per
 * `agents.entries.developer.sandbox.workspaceAccess: "rw"` (confirmed via
 * `openclaw sandbox explain --agent developer` → `runtimeWorkdir:
 * /workspace`). The host-side worktree path (e.g.
 * `/home/kokes/astrid/worktrees/<projectId>/<taskId>`) does not exist
 * inside the container — prompts sent to the "developer" agent must
 * reference this path instead.
 */
export const DEVELOPER_SANDBOX_WORKSPACE = "/workspace";

const CLI_BIN = process.env.OPENCLAW_CLI_PATH || "openclaw";
const CONFIG_SET_TIMEOUT_MS = 15_000;
const SANDBOX_RECREATE_TIMEOUT_MS = 30_000;

interface CliResult {
  ok: boolean;
  stdout: string;
  stderr: string;
}

function runOpenClawCli(args: string[], timeoutMs: number): Promise<CliResult> {
  return new Promise((resolve) => {
    execFile(
      /* turbopackIgnore: true */ CLI_BIN,
      args,
      { timeout: timeoutMs, maxBuffer: 5 * 1024 * 1024 },
      (error, stdout, stderr) => resolve({ ok: !error, stdout, stderr }),
    );
  });
}

export type PointDeveloperSandboxOutcome = { ok: true } | { ok: false; detail: string };

/**
 * Repoints the "developer" agent's sandbox workspace at `worktreeDir` and
 * forces its container to be recreated so it takes effect. `worktreeDir`
 * must be a server-generated path (see `workspace.ts#getTaskWorktreePath`)
 * — never client input.
 */
export async function pointDeveloperSandboxAt(worktreeDir: string): Promise<PointDeveloperSandboxOutcome> {
  const setResult = await runOpenClawCli(
    ["config", "set", "agents.entries.developer.workspace", JSON.stringify(worktreeDir), "--strict-json"],
    CONFIG_SET_TIMEOUT_MS,
  );
  if (!setResult.ok) {
    return {
      ok: false,
      detail: `No se pudo apuntar el sandbox del Developer al worktree de la tarea: ${setResult.stderr.slice(0, 300) || "sin detalle"}`,
    };
  }

  // --force is required: without it, `sandbox recreate` prompts for an
  // interactive y/n confirmation and would hang forever with no TTY to
  // answer it (confirmed live — the bare command blocked until killed).
  const recreateResult = await runOpenClawCli(
    ["sandbox", "recreate", "--agent", DEVELOPER_AGENT_ID, "--force"],
    SANDBOX_RECREATE_TIMEOUT_MS,
  );
  if (!recreateResult.ok) {
    return {
      ok: false,
      detail: `No se pudo recrear el contenedor sandbox del Developer: ${recreateResult.stderr.slice(0, 300) || "sin detalle"}`,
    };
  }

  return { ok: true };
}

/**
 * OpenClaw auto-creates these generic "agent home" bootstrap files the
 * first time an agent's `workspace` points at a directory that lacks them
 * — confirmed live: a single "developer" turn against a brand-new,
 * otherwise-untouched AgroFresh worktree left all four behind, fully
 * unrelated to the actual instruction. Fixed, exact, root-level filenames
 * only — never a pattern/glob.
 */
const OPENCLAW_BOOTSTRAP_FILENAMES = new Set([
  "AGENTS.md",
  "IDENTITY.md",
  "SOUL.md",
  "USER.md",
  "BOOTSTRAP.md",
  "HEARTBEAT.md",
  "MEMORY.md",
]);

/**
 * Deletes OpenClaw's own workspace-bootstrap files from a task worktree —
 * if, and only if, Git reports them as untracked (`??`). Left alone, they
 * would silently ride along in `filesChanged`/the diff and eventually get
 * committed by `task-approval-service.ts`, even though the human reviewer
 * never asked for them and the model was never actually instructed to
 * create them. Only ever removes an exact filename from this fixed list
 * that Git already considers untracked — never a tracked file, so a
 * legitimately pre-existing project file with the same name is never
 * touched. Returns the filenames actually removed, for logging.
 */
export async function stripOpenClawBootstrapArtifacts(worktreeDir: string): Promise<string[]> {
  const untracked = await git.getUntrackedFiles(worktreeDir);
  const removed: string[] = [];
  for (const relPath of untracked) {
    if (!OPENCLAW_BOOTSTRAP_FILENAMES.has(relPath)) continue;
    try {
      unlinkSync(path.join(worktreeDir, relPath));
      removed.push(relPath);
    } catch (error) {
      console.error(`[sandbox-service] no se pudo eliminar el artefacto de bootstrap "${relPath}":`, error);
    }
  }
  return removed;
}
