import { createConversation, listConversations, toPublicConversation } from "@/lib/server/conversation-store";
import type { CreateConversationRequest } from "@/lib/types";

/**
 * GET /api/conversations
 *
 * Lists conversations (SQLite-backed — see `conversation-store.ts`),
 * most recently updated first. The first entry is the "active" one: there
 * is no separate session/flag, the most recently updated conversation
 * simply is the current one (see the module docs on `conversation-store.ts`).
 */
export async function GET() {
  const conversations = listConversations().map(toPublicConversation);
  return Response.json({ conversations });
}

/**
 * POST /api/conversations
 *
 * Creates a new conversation. Body is optional — the "Nueva conversación"
 * action in the UI creates the row lazily on first message instead, but
 * this endpoint also supports creating one upfront with a known `projectId`.
 */
export async function POST(request: Request) {
  let body: CreateConversationRequest = {};

  try {
    body = (await request.json()) as CreateConversationRequest;
  } catch {
    // No body / not JSON — fine, an empty conversation is still valid.
  }

  const conversation = createConversation({ projectId: body.projectId, title: body.title });
  return Response.json({ conversation: toPublicConversation(conversation) });
}
