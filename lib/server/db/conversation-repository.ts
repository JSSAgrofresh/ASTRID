import type { ChatMessageType, ChatOperationStatus, ChatRole, ChatStep, ConversationStatus, PublicTask } from "@/lib/types";
import { getDb } from "./connection";

/**
 * Extra `ChatMessage` fields beyond `role`/`content`/`type` that don't get
 * their own column — stored as one JSON blob in `messages.metadata`.
 * Deliberately built only from `PublicTask` (never a raw `StoredTask`), so
 * `workspacePath`/`worktreeDir`/`instruction` can never reach this table.
 */
export interface ChatMessageMetadata {
  status?: ChatOperationStatus;
  agent?: string;
  steps?: ChatStep[];
  task?: PublicTask;
}

export interface StoredConversation {
  conversationId: string;
  projectId?: string;
  title: string;
  status: ConversationStatus;
  createdAt: string;
  updatedAt: string;
}

export interface StoredMessage {
  messageId: string;
  conversationId: string;
  role: ChatRole;
  content: string;
  type?: ChatMessageType;
  createdAt: string;
  metadata?: ChatMessageMetadata;
}

/**
 * Storage boundary, same shape as `task-repository.ts`'s `TaskRepository`:
 * `conversation-store.ts` is the only module that constructs a
 * `ConversationRepository`. Migrating SQLite to Postgres later means
 * writing a new class that implements this interface and changing the one
 * line in `conversation-store.ts` that instantiates it.
 */
export interface ConversationRepository {
  listConversations(): StoredConversation[];
  getConversation(conversationId: string): StoredConversation | undefined;
  saveConversation(conversation: StoredConversation): StoredConversation;
  listMessages(conversationId: string): StoredMessage[];
  appendMessage(message: StoredMessage): StoredMessage;
}

interface ConversationRow {
  conversation_id: string;
  project_id: string | null;
  title: string;
  status: string;
  created_at: string;
  updated_at: string;
}

interface MessageRow {
  message_id: string;
  conversation_id: string;
  role: string;
  content: string;
  type: string | null;
  created_at: string;
  metadata: string | null;
}

function rowToConversation(row: ConversationRow): StoredConversation {
  return {
    conversationId: row.conversation_id,
    projectId: row.project_id ?? undefined,
    title: row.title,
    status: row.status as ConversationStatus,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function rowToMessage(row: MessageRow): StoredMessage {
  return {
    messageId: row.message_id,
    conversationId: row.conversation_id,
    role: row.role as ChatRole,
    content: row.content,
    type: (row.type as ChatMessageType | null) ?? undefined,
    createdAt: row.created_at,
    metadata: row.metadata ? (JSON.parse(row.metadata) as ChatMessageMetadata) : undefined,
  };
}

/** SQLite-backed `ConversationRepository`. See module docs above for the migration seam. */
export class SqliteConversationRepository implements ConversationRepository {
  listConversations(): StoredConversation[] {
    const rows = getDb()
      .prepare("SELECT * FROM conversations ORDER BY updated_at DESC")
      .all() as unknown as ConversationRow[];
    return rows.map(rowToConversation);
  }

  getConversation(conversationId: string): StoredConversation | undefined {
    const row = getDb()
      .prepare("SELECT * FROM conversations WHERE conversation_id = ?")
      .get(conversationId) as ConversationRow | undefined;
    return row ? rowToConversation(row) : undefined;
  }

  saveConversation(conversation: StoredConversation): StoredConversation {
    getDb()
      .prepare(
        `INSERT INTO conversations (
          conversation_id, project_id, title, status, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?)
        ON CONFLICT(conversation_id) DO UPDATE SET
          project_id = excluded.project_id,
          title = excluded.title,
          status = excluded.status,
          updated_at = excluded.updated_at`,
      )
      .run(
        conversation.conversationId,
        conversation.projectId ?? null,
        conversation.title,
        conversation.status,
        conversation.createdAt,
        conversation.updatedAt,
      );
    return conversation;
  }

  listMessages(conversationId: string): StoredMessage[] {
    const rows = getDb()
      .prepare("SELECT * FROM messages WHERE conversation_id = ? ORDER BY created_at ASC")
      .all(conversationId) as unknown as MessageRow[];
    return rows.map(rowToMessage);
  }

  appendMessage(message: StoredMessage): StoredMessage {
    getDb()
      .prepare(
        `INSERT INTO messages (
          message_id, conversation_id, role, content, type, created_at, metadata
        ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        message.messageId,
        message.conversationId,
        message.role,
        message.content,
        message.type ?? null,
        message.createdAt,
        message.metadata ? JSON.stringify(message.metadata) : null,
      );
    return message;
  }
}
