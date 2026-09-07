import type { AppendMessageRequest, ChatMessage, PublicConversation } from "@/lib/types";
import {
  SqliteConversationRepository,
  type ChatMessageMetadata,
  type ConversationRepository,
  type StoredConversation,
  type StoredMessage,
} from "./db/conversation-repository";

export type { StoredConversation, StoredMessage };

const DEFAULT_TITLE = "Nueva conversación";
const TITLE_MAX_LENGTH = 60;

/**
 * Server-side conversation/message persistence, backed by SQLite (see
 * `db/connection.ts` and `db/conversation-repository.ts`) so chat history
 * survives client-side navigation and a Next.js server restart. Same
 * pattern as `task-store.ts`: this module is the ONLY place that
 * constructs a `ConversationRepository`; every other module (API routes)
 * calls only the functions below.
 *
 * There is no separate "which conversation is active" flag or session —
 * this is a single-user tool with no accounts. The active conversation is
 * simply whichever one was updated most recently (`listConversations()[0]`),
 * which is naturally correct whether the user is returning from another
 * route, reopening the app after a restart, or just sent a message.
 */
const repo: ConversationRepository = new SqliteConversationRepository();

export function listConversations(): StoredConversation[] {
  return repo.listConversations();
}

export function getConversation(conversationId: string): StoredConversation | undefined {
  return repo.getConversation(conversationId);
}

export function getMessages(conversationId: string): StoredMessage[] {
  return repo.listMessages(conversationId);
}

export function newConversationId(): string {
  return `conv-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}

export function newMessageId(): string {
  return `msg-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}

export function createConversation(input: { projectId?: string; title?: string }): StoredConversation {
  const now = new Date().toISOString();
  return repo.saveConversation({
    conversationId: newConversationId(),
    projectId: input.projectId,
    title: deriveTitle(input.title) ?? DEFAULT_TITLE,
    status: "active",
    createdAt: now,
    updatedAt: now,
  });
}

/**
 * Appends one message and bumps the conversation's `updatedAt` (which is
 * what makes it the "active" one again — see module docs). If the
 * conversation still has the placeholder title and this is the first user
 * message, derives a real title from it.
 */
export function appendMessage(
  conversationId: string,
  input: AppendMessageRequest,
): { conversation: StoredConversation; message: StoredMessage } | undefined {
  const conversation = repo.getConversation(conversationId);
  if (!conversation) return undefined;

  const now = new Date().toISOString();
  const metadata: ChatMessageMetadata = {
    status: input.status,
    agent: input.agent,
    steps: input.steps,
    task: input.task,
  };
  const hasMetadata = Object.values(metadata).some((value) => value !== undefined);

  const message = repo.appendMessage({
    messageId: newMessageId(),
    conversationId,
    role: input.role,
    content: input.content,
    type: input.type,
    createdAt: now,
    metadata: hasMetadata ? metadata : undefined,
  });

  const shouldDeriveTitle = input.role === "user" && conversation.title === DEFAULT_TITLE;
  const updated = repo.saveConversation({
    ...conversation,
    title: shouldDeriveTitle ? (deriveTitle(input.content) ?? conversation.title) : conversation.title,
    updatedAt: now,
  });

  return { conversation: updated, message };
}

function deriveTitle(source: string | undefined): string | undefined {
  const oneLine = source?.replace(/\s+/g, " ").trim();
  if (!oneLine) return undefined;
  return oneLine.length > TITLE_MAX_LENGTH ? `${oneLine.slice(0, TITLE_MAX_LENGTH - 1)}…` : oneLine;
}

/** Explicit allowlist projection so nothing beyond `PublicConversation`'s fields ever leaves this function. */
export function toPublicConversation(conversation: StoredConversation): PublicConversation {
  return {
    conversationId: conversation.conversationId,
    projectId: conversation.projectId,
    title: conversation.title,
    status: conversation.status,
    createdAt: conversation.createdAt,
    updatedAt: conversation.updatedAt,
  };
}

function formatTimestamp(iso: string): string {
  return new Date(iso).toLocaleTimeString("es", { hour: "2-digit", minute: "2-digit" });
}

/** Reconstructs the `ChatMessage` shape the UI already knows how to render (`MessageBubble`, `StepTimeline`, `ApprovalCard`) from a persisted row. */
export function toChatMessage(message: StoredMessage): ChatMessage {
  return {
    id: message.messageId,
    role: message.role,
    content: message.content,
    timestamp: formatTimestamp(message.createdAt),
    type: message.type,
    status: message.metadata?.status,
    agent: message.metadata?.agent,
    steps: message.metadata?.steps,
    task: message.metadata?.task,
  };
}
