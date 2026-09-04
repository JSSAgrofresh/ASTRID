import { createAndRegisterRepo } from "@/lib/server/project-registry";
import type { CreateRepositoryRequest } from "@/lib/types";

/**
 * POST /api/repositories/create
 *
 * Creates a brand-new GitHub repository and registers it with ASTRID.
 * HARD requirement: the body must include `"confirm": true` — this is the
 * explicit-approval gate for repo creation. The UI must render a concrete
 * summary (name, visibility, options) and get a distinct second click
 * before ever sending that flag; a plain chat instruction can never reach
 * this route (it is not wired into the OpenClaw/task-runner message flow
 * at all).
 */
export async function POST(request: Request) {
  let body: CreateRepositoryRequest;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "El cuerpo de la petición no es JSON válido." }, { status: 400 });
  }

  if (typeof body.name !== "string" || !body.name.trim()) {
    return Response.json({ error: 'El campo "name" es requerido.' }, { status: 400 });
  }
  if (body.visibility !== "public" && body.visibility !== "private") {
    return Response.json({ error: 'El campo "visibility" debe ser "public" o "private".' }, { status: 400 });
  }
  if (body.confirm !== true) {
    return Response.json(
      { error: "Falta confirmación explícita: crear un repositorio nuevo requiere aprobación." },
      { status: 400 },
    );
  }

  const outcome = await createAndRegisterRepo(body);
  if (!outcome.ok) {
    return Response.json({ error: outcome.detail }, { status: 422 });
  }
  return Response.json({ project: outcome.project });
}
