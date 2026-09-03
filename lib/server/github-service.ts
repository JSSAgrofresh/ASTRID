import { execFile } from "node:child_process";

/**
 * Minimal GitHub CLI (`gh`) wrapper. Only exports `createPullRequest` —
 * there is no generic "run this gh command", no merge function, and no
 * function that touches an existing PR's state. `gh` itself authenticates
 * using its own stored credentials (`gh auth status`); this module never
 * reads or handles a GitHub token directly.
 */

interface GhResult {
  ok: boolean;
  stdout: string;
  stderr: string;
}

function runGh(args: string[], cwd: string, timeoutMs: number): Promise<GhResult> {
  return new Promise((resolve) => {
    execFile(
      /* turbopackIgnore: true */ "gh",
      args,
      { cwd, timeout: timeoutMs, maxBuffer: 5 * 1024 * 1024 },
      (error, stdout, stderr) => resolve({ ok: !error, stdout, stderr }),
    );
  });
}

export interface CreatePullRequestParams {
  cwd: string;
  title: string;
  body: string;
  base: string;
  head: string;
}

export type CreatePullRequestResult = { ok: true; url: string } | { ok: false; detail: string };

/** `gh pr create --title ... --body ... --base ... --head ...`. Never merges, never edits an existing PR. */
export async function createPullRequest(params: CreatePullRequestParams): Promise<CreatePullRequestResult> {
  const result = await runGh(
    ["pr", "create", "--title", params.title, "--body", params.body, "--base", params.base, "--head", params.head],
    params.cwd,
    45_000,
  );

  if (!result.ok) {
    return { ok: false, detail: result.stderr.trim() || "gh pr create no tuvo éxito." };
  }

  // `gh pr create` prints the new PR's URL as the last non-empty stdout line.
  const url = result.stdout
    .trim()
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .pop();

  if (!url || !url.startsWith("http")) {
    return { ok: false, detail: `Salida inesperada de "gh pr create": ${result.stdout.slice(0, 300)}` };
  }

  return { ok: true, url };
}
