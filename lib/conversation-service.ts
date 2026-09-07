import type { AppendMessageRequest, ChatMessage, CreateConversationRequest, PublicConversation } from "@/lib/types";

/**
 * Thin client for `/api/conversations*`. Mirrors `chat-service.ts` and
 * `task-service.ts`: the UI only ever depends on this contract, never on
 * how conversations/messages are stored.
 */
export class ConversationServiceError extends Error {}

async function parseJson<T>(res: Response, action: string): Promise<T> {
  let payload: T & { error?: string };
  try {
    payload = await res.json();
  } catch {
    throw new ConversationServiceError(`${action}: respuesta inválida del servidor (${res.status}).`);
  }
  if (!res.ok) {
    throw new ConversationServiceError(payload.error ?? `${action}: el servidor respondió con un error (${res.status}).`);
  }
  return payload;
}

export async function listConversations(): Promise<PublicConversation[]> {
  let res: Response;
  try {
    res = await fetch("/api/conversations");
  } catch {
    throw new ConversationServiceError("No se pudo contactar al servidor para listar conversaciones.");
  }
  const data = await parseJson<{ conversations: PublicConversation[] }>(res, "Listar conversaciones");
  return data.conversations;
}

export async function createConversation(request: CreateConversationRequest = {}): Promise<PublicConversation> {
  let res: Response;
  try {
    res = await fetch("/api/conversations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(request),
    });
  } catch {
    throw new ConversationServiceError("No se pudo contactar al servidor para crear la conversación.");
  }
  const data = await parseJson<{ conversation: PublicConversation }>(res, "Crear conversación");
  return data.conversation;
}

export async function getConversation(conversationId: string): Promise<{ conversation: PublicConversation; messages: ChatMessage[] }> {
  let res: Response;
  try {
    res = await fetch(`/api/conversations/${encodeURIComponent(conversationId)}`);
  } catch {
    throw new ConversationServiceError("No se pudo contactar al servidor para cargar la conversación.");
  }
  return parseJson(res, "Cargar conversación");
}

export async function appendMessage(
  conversationId: string,
  request: AppendMessageRequest,
): Promise<{ conversation: PublicConversation; message: ChatMessage }> {
  let res: Response;
  try {
    res = await fetch(`/api/conversations/${encodeURIComponent(conversationId)}/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(request),
    });
  } catch {
    throw new ConversationServiceError("No se pudo contactar al servidor para guardar el mensaje.");
  }
  return parseJson(res, "Guardar mensaje");
}
