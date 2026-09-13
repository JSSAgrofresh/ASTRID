import { execFile } from "node:child_process";
import { mkdirSync } from "node:fs";
import path from "node:path";

/**
 * Deterministic, low-level Git primitives used by `task-runner.ts` to build
 * and inspect an isolated edit task. This is the hard security boundary
 * for Git itself: every exported function calls `execFile("git", <fixed
 * argv>)` with an explicit, hardcoded subcommand — there is no generic
 * "run this git command" export. `push`, `merge`, `reset --hard`,
 * `clean -fd`, force-push, remote branch deletion, etc. are not just
 * disallowed by policy — the functions to invoke them do not exist here.
 *
 * (OpenClaw itself, invoked separately by `task-runner.ts` to make the
 * actual content edit, is NOT restricted by this module — it has its own
 * unrestricted shell access, per the caveats documented in
 * `openclaw-client.ts` and `task-runner.ts`. This module only guarantees
 * that SANAI's *own* server code never issues a destructive Git command.)
 */

interface GitResult {
  ok: boolean;
  stdout: string;
  stderr: string;
  code: number | null;
}

function runGit(args: string[], cwd: string, timeoutMs = 30_000): Promise<GitResult> {
  return new Promise((resolve) => {
    execFile(
      /* turbopackIgnore: true */ "git",
      args,
      { cwd, timeout: timeoutMs, maxBuffer: 20 * 1024 * 1024 },
      (error, stdout, stderr) => {
        resolve({
          ok: !error,
          stdout,
          stderr,
          code: error && "code" in error && typeof error.code === "number" ? error.code : error ? 1 : 0,
        });
      },
    );
  });
}

/** `git status --porcelain` — empty string means a clean working tree. */
export async function getStatusPorcelain(cwd: string): Promise<GitResult> {
  return runGit(["status", "--porcelain"], cwd);
}

/** Current branch name via `git rev-parse --abbrev-ref HEAD`. */
export async function getCurrentBranch(cwd: string): Promise<GitResult> {
  return runGit(["rev-parse", "--abbrev-ref", "HEAD"], cwd);
}

/**
 * `git remote get-url origin` — fails (non-zero exit) if `cwd` isn't a Git
 * repo at all, or has no `origin` remote. Used by `project-registry.ts` to
 * confirm an already-existing local directory is really a clone of the
 * expected GitHub repo before registering it, never to alter remotes.
 */
export async function getRemoteUrl(cwd: string, remote = "origin"): Promise<GitResult> {
  return runGit(["remote", "get-url", remote], cwd);
}

/** Whether a local branch with this exact name already exists. */
export async function branchExists(cwd: string, branch: string): Promise<boolean> {
  const result = await runGit(["show-ref", "--verify", "--quiet", `refs/heads/${branch}`], cwd);
  return result.ok;
}

/**
 * Creates a brand-new isolated worktree checked out on a brand-new branch,
 * branched off `baseRef` — one atomic Git operation, never touches the
 * original working directory's files or index.
 */
export async function createWorktree(
  repoDir: string,
  worktreeDir: string,
  branch: string,
  baseRef: string,
): Promise<GitResult> {
  mkdirSync(path.dirname(worktreeDir), { recursive: true });
  return runGit(["worktree", "add", "-b", branch, worktreeDir, baseRef], repoDir, 60_000);
}

/** List of changed files (relative paths) parsed from `git status --porcelain`. */
export async function getChangedFiles(cwd: string): Promise<string[]> {
  const result = await getStatusPorcelain(cwd);
  if (!result.ok) return [];
  return result.stdout
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => line.replace(/^[A-Z?!]{1,2}\s+/, "").trim());
}

/** Untracked (brand-new, unknown to Git) files only — the `??` lines from `git status --porcelain`. */
export async function getUntrackedFiles(cwd: string): Promise<string[]> {
  const result = await getStatusPorcelain(cwd);
  if (!result.ok) return [];
  return result.stdout
    .split("\n")
    .filter((line) => line.startsWith("??"))
    .map((line) => line.slice(3).trim())
    .filter(Boolean);
}

/** `git diff --stat HEAD` — short human-readable summary of the change. */
export async function getDiffStat(cwd: string): Promise<string> {
  const result = await runGit(["diff", "--stat", "HEAD"], cwd);
  return result.ok ? result.stdout.trim() : "";
}

/** Full unified diff (`git diff HEAD`), truncated defensively for huge changes. */
export async function getDiff(cwd: string, maxChars = 20_000): Promise<string> {
  const result = await runGit(["diff", "HEAD"], cwd);
  if (!result.ok) return "";
  const diff = result.stdout;
  return diff.length > maxChars ? `${diff.slice(0, maxChars)}\n\n… (diff truncado, ${diff.length} caracteres totales)` : diff;
}

/**
 * Read-only remote check — `git ls-remote` never pushes, fetches, or
 * writes anything local; it just asks the remote whether a ref exists.
 * Used purely to *verify* (not enforce) that a task branch was never
 * pushed, since SANAI's own code never calls `git push` and this is the
 * cheapest independent confirmation of that fact.
 */
export async function remoteBranchExists(cwd: string, branch: string): Promise<GitResult> {
  return runGit(["ls-remote", "--exit-code", "--heads", "origin", branch], cwd, 15_000);
}

// --- Approval-stage primitives ---------------------------------------
// Same hard boundary as above: fixed subcommands only. Notably absent on
// purpose: --amend, reset (any form), clean, and any --force/-f flag on
// push. Those are not "disabled" — there is no function here that could
// invoke them.

/** `git add -A`, scoped to this worktree (never the original workspace). */
export async function stageAll(cwd: string): Promise<GitResult> {
  return runGit(["add", "-A"], cwd);
}

/** `git commit -m <message>`. No --amend is ever passed. */
export async function commit(cwd: string, message: string): Promise<GitResult> {
  return runGit(["commit", "-m", message], cwd);
}

/** SHA of the current HEAD, e.g. right after a commit. */
export async function getHeadSha(cwd: string): Promise<GitResult> {
  return runGit(["rev-parse", "HEAD"], cwd);
}

/** `git push --set-upstream origin <branch>` — never --force / --force-with-lease. */
export async function pushBranch(cwd: string, branch: string): Promise<GitResult> {
  return runGit(["push", "--set-upstream", "origin", branch], cwd, 60_000);
}
