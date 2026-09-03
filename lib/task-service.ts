import type { PublicTask } from "@/lib/types";

/**
 * Thin client for `POST /api/tasks/[taskId]/approve`. Mirrors
 * `chat-service.ts`: the browser only ever sends `taskId` (in the URL)
 * and an `action` — never a workspace path, branch, or Git command. All
 * of that is resolved server-side from the stored task record.
 */
export class TaskServiceError extends Error {}

export interface ApproveTaskResult {
  ok: boolean;
  task: PublicTask;
  error?: string;
}

export async function respondToTask(taskId: string, action: "approve" | "reject"): Promise<ApproveTaskResult> {
  let res: Response;

  try {
    res = await fetch(`/api/tasks/${encodeURIComponent(taskId)}/approve`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    });
  } catch {
    throw new TaskServiceError("No se pudo contactar al servidor para procesar esta acción.");
  }

  let payload: ApproveTaskResult;
  try {
    payload = await res.json();
  } catch {
    throw new TaskServiceError(`Respuesta inválida del servidor (${res.status}).`);
  }

  if (!res.ok && res.status !== 409) {
    throw new TaskServiceError(payload.error ?? `El servidor respondió con un error (${res.status}).`);
  }

  return payload;
}
