import { getConversation, getMessages, toChatMessage, toPublicConversation } from "@/lib/server/conversation-store";

/**
 * GET /api/conversations/[id]
 *
 * Returns one conversation plus its messages, in order — everything
 * `ChatShell` needs to fully reconstruct chat history (including
 * `StepTimeline`/`ApprovalCard` state via each message's `steps`/`task`)
 * after navigating away and back, or after a server restart.
 */
export async function GET(_request: Request, ctx: RouteContext<"/api/conversations/[id]">) {
  const { id } = await ctx.params;

  const conversation = getConversation(id);
  if (!conversation) {
    return Response.json({ error: "Conversación no encontrada." }, { status: 404 });
  }

  const messages = getMessages(id).map(toChatMessage);
  return Response.json({ conversation: toPublicConversation(conversation), messages });
}
