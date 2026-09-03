import type { ChatRequest, ChatResponse } from "@/lib/types";

/**
 * Thin client for `POST /api/chat`. This is the only place the chat UI
 * talks to the backend — it knows nothing about mocks or OpenClaw, only
 * the request/response contract. When the API route starts proxying to
 * the OpenClaw Gateway, this function does not need to change.
 */
export class ChatServiceError extends Error {}

export async function sendChatMessage(request: ChatRequest): Promise<ChatResponse> {
  let res: Response;

  try {
    res = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(request),
    });
  } catch {
    throw new ChatServiceError("No se pudo contactar al servicio de chat.");
  }

  if (!res.ok) {
    throw new ChatServiceError(`El servicio de chat respondió con un error (${res.status}).`);
  }

  return (await res.json()) as ChatResponse;
}
