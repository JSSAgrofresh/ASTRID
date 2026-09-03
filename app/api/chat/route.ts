import { askOpenClaw } from "@/lib/server/openclaw-client";
import { generateMockChatResponse } from "@/lib/server/chat-mock-engine";
import { isEditTaskRequest, runEditTask } from "@/lib/server/task-runner";
import { resolveProjectWorkspace } from "@/lib/server/workspace";
import { projects } from "@/lib/data";
import type { ChatRequest, ChatResponse } from "@/lib/types";

const FALLBACK_UNAVAILABLE_MESSAGE = "No fue posible conectar con ASTRID Core.";
const WORKSPACE_UNAVAILABLE_MESSAGE = "El workspace del proyecto seleccionado no está disponible.";

// Real repo analysis (the model reading/listing files through exec/process
// tools) runs noticeably longer than plain conversation — measured ~30-35s
// for a full-stack summary of a mid-sized repo. Plain chat keeps the
// shorter default from openclaw-client.ts.
const PROJECT_ANALYSIS_TIMEOUT_MS = 120_000;

const READ_ONLY_POLICY = [
  "Política de esta etapa — MODO SOLO LECTURA:",
  "Puedes listar archivos, leer archivos, inspeccionar la estructura y buscar código dentro del workspace indicado, para analizarlo.",
  "NO debes modificar archivos, crear archivos, borrar archivos, crear ramas, hacer commit, hacer push, abrir Pull Requests, instalar paquetes ni ejecutar ninguna acción destructiva.",
  "Si la instrucción pide algo de eso, explica que esta etapa es solo de análisis y no lo hagas.",
].join("\n");

function buildProjectContext(projectName: string, workspacePath: string): string {
  return [
    "Contexto de ASTRID:",
    `- Proyecto seleccionado: ${projectName}`,
    `- Workspace real (ruta absoluta ya validada por el servidor): ${workspacePath}`,
    "",
    READ_ONLY_POLICY,
  ].join("\n");
}

/**
 * POST /api/chat
 *
 * Default path: forwards the message to the real OpenClaw Gateway via
 * `lib/server/openclaw-client.ts` and returns its real reply. When the
 * request carries a `projectId`, the server (never the client) resolves it
 * to a validated, allowlisted workspace path via
 * `lib/server/workspace.ts` and tells OpenClaw exactly where to look —
 * this stage is read-only analysis only, communicated explicitly in the
 * prompt (see READ_ONLY_POLICY).
 *
 * `generateMockChatResponse` (from stage 2) is kept only as an explicit
 * opt-in for local development/tests, selected with `CHAT_BACKEND=mock`.
 * It is never the default.
 */
export async function POST(request: Request) {
  let body: ChatRequest;

  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "El cuerpo de la petición no es JSON válido." }, { status: 400 });
  }

  if (typeof body.message !== "string" || !body.message.trim()) {
    return Response.json({ error: "El campo 'message' es requerido." }, { status: 400 });
  }

  if (process.env.CHAT_BACKEND === "mock") {
    return Response.json(generateMockChatResponse(body));
  }

  // Isolated Git edit task — server-orchestrated (see task-runner.ts),
  // never OpenClaw editing the primary workspace directly.
  if (body.projectId && isEditTaskRequest(body.message)) {
    const response = await runEditTask({ message: body.message, projectId: body.projectId });
    return Response.json(response);
  }

  let contextHint: string | undefined;
  let timeoutMs: number | undefined;

  if (body.projectId) {
    const resolution = resolveProjectWorkspace(body.projectId);

    if (!resolution.ok) {
      // Fail fast and honestly — never call OpenClaw with a project context
      // we couldn't validate, and never claim a generic connectivity issue
      // when the real problem is a bad/unknown project selection.
      console.error(`[api/chat] workspace no disponible (${resolution.kind}):`, resolution.detail);
      const response: ChatResponse = {
        message: WORKSPACE_UNAVAILABLE_MESSAGE,
        type: "conversation",
        status: "error",
      };
      return Response.json(response);
    }

    const projectName = projects.find((project) => project.id === resolution.workspace.projectId)?.name ?? resolution.workspace.projectId;
    contextHint = buildProjectContext(projectName, resolution.workspace.workspacePath);
    timeoutMs = PROJECT_ANALYSIS_TIMEOUT_MS;
  }

  const outcome = await askOpenClaw(body.message, { contextHint, timeoutMs });

  if (outcome.ok) {
    const response: ChatResponse = { message: outcome.reply, type: "conversation" };
    return Response.json(response);
  }

  // Never fabricate a successful reply. Surface what actually happened:
  // a transport-level failure gets the exact honest fallback text; a
  // server misconfiguration gets its own clear message; an error OpenClaw
  // itself reported gets its real message.
  const message =
    outcome.kind === "unavailable" || outcome.kind === "timeout"
      ? FALLBACK_UNAVAILABLE_MESSAGE
      : outcome.kind === "misconfigured"
        ? outcome.detail
        : `ASTRID Core respondió con un error: ${outcome.detail}`;

  const response: ChatResponse = { message, type: "conversation", status: "error" };
  return Response.json(response);
}
