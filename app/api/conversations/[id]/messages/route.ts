import { appendMessage, getConversation, toChatMessage, toPublicConversation } from "@/lib/server/conversation-store";
import type { AppendMessageRequest } from "@/lib/types";

const VALID_ROLES = new Set(["user", "astrid", "system"]);

/**
 * POST /api/conversations/[id]/messages
 *
 * Appends one message to a conversation and returns it as reconstructed
 * (see `toChatMessage`). Never accepts a `StoredTask`/workspace path —
 * `task`, when present, must already be the client-safe `PublicTask` the
 * chat UI itself received from `/api/chat` or `/api/tasks/[taskId]/approve`.
 */
export async function POST(request: Request, ctx: RouteContext<"/api/conversations/[id]/messages">) {
  const { id } = await ctx.params;

  let body: AppendMessageRequest;
  try {
    body = (await request.json()) as AppendMessageRequest;
  } catch {
    return Response.json({ error: "El cuerpo de la petición no es JSON válido." }, { status: 400 });
  }

  if (typeof body.content !== "string" || !body.content.trim()) {
    return Response.json({ error: "El campo 'content' es requerido." }, { status: 400 });
  }

  if (typeof body.role !== "string" || !VALID_ROLES.has(body.role)) {
    return Response.json({ error: "El campo 'role' es inválido." }, { status: 400 });
  }

  if (!getConversation(id)) {
    return Response.json({ error: "Conversación no encontrada." }, { status: 404 });
  }

  const result = appendMessage(id, body);
  if (!result) {
    return Response.json({ error: "Conversación no encontrada." }, { status: 404 });
  }

  return Response.json({
    conversation: toPublicConversation(result.conversation),
    message: toChatMessage(result.message),
  });
}
