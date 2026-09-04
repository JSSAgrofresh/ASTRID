import { listProjects, toPublicProject } from "@/lib/server/project-store";

/**
 * GET /api/projects
 *
 * Lists projects registered with ASTRID (the SQLite-backed registry —
 * see `project-store.ts`). Always projects through `toPublicProject`, so
 * `workspacePath` never leaves the server.
 */
export async function GET() {
  const projects = listProjects().map(toPublicProject);
  return Response.json({ projects });
}
