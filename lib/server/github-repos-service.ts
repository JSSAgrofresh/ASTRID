import { execFile } from "node:child_process";

/**
 * GitHub CLI (`gh`) wrapper for repository discovery/clone/create —
 * sibling to `github-service.ts` (which only handles Pull Requests).
 * Same hard boundary as every other `gh`/`git` wrapper in this codebase:
 * fixed subcommands only, `execFile` with an argv array (never a shell
 * string), so client input can never be interpreted as shell syntax or
 * smuggle extra flags. `gh` authenticates using its own stored
 * credentials (`gh auth status`); this module never reads or handles a
 * GitHub token directly, and no token is ever sent to the browser.
 *
 * No function here deletes, transfers, renames, changes visibility,
 * archives, or touches collaborators/secrets/branch protection on a
 * repo — those are out of scope by construction (no such function to
 * call), not merely by policy.
 */

interface GhResult {
  ok: boolean;
  stdout: string;
  stderr: string;
}

function runGh(args: string[], timeoutMs: number, cwd?: string): Promise<GhResult> {
  return new Promise((resolve) => {
    execFile(
      /* turbopackIgnore: true */ "gh",
      args,
      { cwd, timeout: timeoutMs, maxBuffer: 5 * 1024 * 1024 },
      (error, stdout, stderr) => resolve({ ok: !error, stdout, stderr }),
    );
  });
}

const REPO_LIST_FIELDS =
  "owner,name,nameWithOwner,visibility,isPrivate,isArchived,isFork,defaultBranchRef,url,updatedAt,description";

export interface GhRepoEntry {
  owner: { login: string };
  name: string;
  nameWithOwner: string;
  visibility: string;
  isPrivate: boolean;
  isArchived: boolean;
  isFork: boolean;
  defaultBranchRef: { name: string } | null;
  url: string;
  updatedAt: string;
  description: string;
}

export type ListReposResult = { ok: true; repos: GhRepoEntry[] } | { ok: false; detail: string };

/** `gh repo list --json ... --limit N` — repos owned by the authenticated account. Read-only. */
export async function listAuthenticatedRepos(limit = 100): Promise<ListReposResult> {
  const result = await runGh(["repo", "list", "--json", REPO_LIST_FIELDS, "--limit", String(limit)], 20_000);
  if (!result.ok) {
    return { ok: false, detail: result.stderr.trim() || "gh repo list no tuvo éxito." };
  }
  try {
    return { ok: true, repos: JSON.parse(result.stdout) as GhRepoEntry[] };
  } catch {
    return { ok: false, detail: "Salida inesperada de gh repo list (JSON inválido)." };
  }
}

export type ViewRepoResult = { ok: true; repo: GhRepoEntry } | { ok: false; detail: string };

/**
 * `gh repo view <fullName> --json ...` — the actual access-control check:
 * this fails (non-zero exit) if the authenticated account cannot see the
 * repo at all, which is exactly "belongs to or is accessible by the
 * authenticated account". Read-only.
 */
export async function viewRepo(fullName: string): Promise<ViewRepoResult> {
  const result = await runGh(["repo", "view", fullName, "--json", REPO_LIST_FIELDS], 15_000);
  if (!result.ok) {
    return { ok: false, detail: result.stderr.trim() || `No se pudo acceder al repositorio "${fullName}".` };
  }
  try {
    return { ok: true, repo: JSON.parse(result.stdout) as GhRepoEntry };
  } catch {
    return { ok: false, detail: "Salida inesperada de gh repo view (JSON inválido)." };
  }
}

export type CloneRepoResult = { ok: true } | { ok: false; detail: string };

/** `gh repo clone <fullName> <targetDir>`. `targetDir` must already be validated by `workspace.ts`. */
export async function cloneRepo(fullName: string, targetDir: string): Promise<CloneRepoResult> {
  const result = await runGh(["repo", "clone", fullName, targetDir], 120_000);
  if (!result.ok) {
    return { ok: false, detail: result.stderr.trim() || `gh repo clone falló para "${fullName}".` };
  }
  return { ok: true };
}

export interface CreateRepoParams {
  name: string;
  description?: string;
  visibility: "public" | "private";
  addReadme: boolean;
  gitignoreTemplate?: string;
  license?: string;
}

export type CreateRepoResult = { ok: true; fullName: string } | { ok: false; detail: string };

/**
 * `gh repo create <name> --public|--private [...]`. Deliberately never
 * passes `--clone` — `project-registry.ts` clones separately via
 * `cloneRepo` above into a path it validates itself, so there is exactly
 * one path-construction authority instead of two.
 */
export async function createRepo(params: CreateRepoParams): Promise<CreateRepoResult> {
  const args = ["repo", "create", params.name, params.visibility === "public" ? "--public" : "--private"];
  if (params.description) args.push("--description", params.description);
  if (params.addReadme) args.push("--add-readme");
  if (params.gitignoreTemplate) args.push("--gitignore", params.gitignoreTemplate);
  if (params.license) args.push("--license", params.license);

  const result = await runGh(args, 30_000);
  if (!result.ok) {
    return { ok: false, detail: result.stderr.trim() || "gh repo create no tuvo éxito." };
  }

  // Confirm the real, authoritative full name via a follow-up read rather
  // than parsing the create command's own stdout (a printed URL) — same
  // "verify, don't trust the tool's transcript" habit as the rest of this
  // codebase.
  const view = await viewRepo(params.name);
  if (!view.ok) {
    return {
      ok: false,
      detail: `El repositorio se creó pero ASTRID no pudo confirmarlo con gh repo view: ${view.detail}`,
    };
  }
  return { ok: true, fullName: view.repo.nameWithOwner };
}
