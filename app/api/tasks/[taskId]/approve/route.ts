import { approveTask, rejectTask } from "@/lib/server/task-approval-service";
import { getTask, toPublicTask } from "@/lib/server/task-store";

/**
 * POST /api/tasks/[taskId]/approve
 *
 * Body: `{ "action": "approve" | "reject" }`. The browser sends only
 * `taskId` (in the URL) and `action` — never a workspace path, a Git
 * command, a branch name, or a remote. Everything else is looked up
 * server-side from the task record created by `task-runner.ts` and
 * re-validated from the live filesystem/Git state before anything real
 * happens (see `task-approval-service.ts`).
 */
export async function POST(request: Request, ctx: RouteContext<"/api/tasks/[taskId]/approve">) {
  const { taskId } = await ctx.params;

  let body: { action?: string };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "El cuerpo de la petición no es JSON válido." }, { status: 400 });
  }

  if (body.action !== "approve" && body.action !== "reject") {
    return Response.json({ error: 'El campo "action" debe ser "approve" o "reject".' }, { status: 400 });
  }

  const existing = getTask(taskId);
  if (!existing) {
    return Response.json({ error: "Tarea no encontrada." }, { status: 404 });
  }

  if (body.action === "reject") {
    const task = rejectTask(taskId);
    return Response.json({ ok: true, task: toPublicTask(task) });
  }

  if (existing.status !== "pending_review") {
    return Response.json(
      { error: `La tarea no está pendiente de revisión (estado actual: "${existing.status}").`, task: toPublicTask(existing) },
      { status: 409 },
    );
  }

  const outcome = await approveTask(taskId);
  return Response.json({ ok: outcome.ok, task: toPublicTask(outcome.task), error: outcome.ok ? undefined : outcome.reason });
}
