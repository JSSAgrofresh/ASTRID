import { registerExistingRepo } from "@/lib/server/project-registry";
import type { RegisterProjectRequest } from "@/lib/types";

/**
 * POST /api/projects/register
 *
 * Body: `{ "fullName": "owner/repo" }`. Registers (cloning if necessary)
 * an existing GitHub repo the server's `gh` account can already see. No
 * approval gate — explicitly an automatic action (clone/register), never
 * a repo creation. Never accepts or returns a filesystem path.
 */
export async function POST(request: Request) {
  let body: RegisterProjectRequest;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "El cuerpo de la petición no es JSON válido." }, { status: 400 });
  }

  if (typeof body.fullName !== "string" || !body.fullName.trim()) {
    return Response.json({ error: 'El campo "fullName" (owner/repo) es requerido.' }, { status: 400 });
  }

  const outcome = await registerExistingRepo(body.fullName);
  if (!outcome.ok) {
    return Response.json({ error: outcome.detail }, { status: 422 });
  }
  return Response.json({ project: outcome.project });
}
