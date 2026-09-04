import { listReposWithLocalStatus } from "@/lib/server/project-registry";

/**
 * GET /api/repositories
 *
 * Lists GitHub repos the server's authenticated `gh` account can see,
 * annotated with each one's local status (`not_cloned` | `cloned` |
 * `registered`). Read-only — no client input at all. Never returns a
 * filesystem path; see `GithubRepoSummary` in `lib/types.ts`.
 */
export async function GET() {
  const result = await listReposWithLocalStatus();
  if (!result.ok) {
    return Response.json({ error: result.detail }, { status: 502 });
  }
  return Response.json({ repos: result.repos });
}
