"use client";

import { useEffect, useRef, useState } from "react";
import { SendIcon } from "@/components/icons";
import { MessageBubble } from "@/components/chat/MessageBubble";
import { Select } from "@/components/ui/Select";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { agents } from "@/lib/data";
import { ChatServiceError, sendChatMessage } from "@/lib/chat-service";
import {
  ConversationServiceError,
  appendMessage as persistMessage,
  createConversation,
  getConversation,
  listConversations,
} from "@/lib/conversation-service";
import { chatOperationStatusMeta } from "@/lib/status";
import type { ChatMessage, PublicConversation, PublicProject } from "@/lib/types";

const agentOptions = [
  { value: "automatico", label: "Automático" },
  ...agents.map((agent) => ({ value: agent.id, label: agent.name })),
];

function now() {
  return new Date().toLocaleTimeString("es", { hour: "2-digit", minute: "2-digit" });
}

function uid(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

function conversationLabel(conversation: PublicConversation) {
  const date = new Date(conversation.updatedAt).toLocaleString("es", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
  return `${conversation.title} · ${date}`;
}

export function ChatShell() {
  // Fetched from the real project registry (SQLite via /api/projects) —
  // never hardcoded, so a newly registered repo shows up here with no
  // code change (see project-registry.ts).
  const [projectOptions, setProjectOptions] = useState<{ value: string; label: string }[]>([]);
  const [selectedProject, setSelectedProject] = useState("");
  const [selectedAgent, setSelectedAgent] = useState(agentOptions[0].value);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [isSending, setIsSending] = useState(false);

  // Server-side (SQLite) conversation history — see conversation-store.ts.
  // `conversationId` is null only for a brand-new, not-yet-persisted
  // conversation; it's created lazily on the first message actually sent.
  const [conversations, setConversations] = useState<PublicConversation[]>([]);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);

  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, isSending]);

  useEffect(() => {
    fetch("/api/projects")
      .then((response) => response.json())
      .then((data: { projects?: PublicProject[] }) => {
        const options = (data.projects ?? []).map((project) => ({
          value: project.projectId,
          label: project.displayName,
        }));
        setProjectOptions(options);
        setSelectedProject((current) => current || options[0]?.value || "");
      })
      .catch(() => {
        /* the project selector just stays empty; sending is disabled without a selection */
      });
  }, []);

  // The "active" conversation is simply the most recently updated one —
  // there is no separate session concept (see conversation-store.ts). This
  // is what makes chat survive navigating away and back (this effect
  // re-runs on every ChatShell mount) and a server restart (the data is on
  // disk, not in memory).
  useEffect(() => {
    let cancelled = false;

    async function loadActiveConversation() {
      try {
        const list = await listConversations();
        if (cancelled) return;
        setConversations(list);

        const active = list[0];
        if (!active) return;

        const { conversation, messages: loaded } = await getConversation(active.conversationId);
        if (cancelled) return;
        setConversationId(conversation.conversationId);
        setMessages(loaded);
        if (conversation.projectId) setSelectedProject(conversation.projectId);
      } catch {
        /* history just starts empty; a new conversation is created on first send */
      } finally {
        if (!cancelled) setIsLoadingHistory(false);
      }
    }

    void loadActiveConversation();
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleSelectConversation(id: string) {
    if (id === conversationId) return;
    try {
      const { conversation, messages: loaded } = await getConversation(id);
      setConversationId(conversation.conversationId);
      setMessages(loaded);
      if (conversation.projectId) setSelectedProject(conversation.projectId);
    } catch {
      /* selection just doesn't switch; the current conversation stays visible */
    }
  }

  function handleNewConversation() {
    setConversationId(null);
    setMessages([]);
    setDraft("");
  }

  // `persistMessage` (POST /api/conversations/[id]/messages) returns the
  // conversation as updated server-side (bumped `updatedAt`, and — for the
  // first user message — a title derived from it, see conversation-store.ts
  // `deriveTitle`). Without re-applying that here, `conversations` would
  // keep showing the create-time snapshot (title "Nueva conversación")
  // until the next full reload, drifting from what's actually in SQLite.
  function upsertConversation(updated: PublicConversation) {
    setConversations((prev) => [updated, ...prev.filter((c) => c.conversationId !== updated.conversationId)]);
  }

  async function handleSend() {
    const text = draft.trim();
    if (!text || isSending || !selectedProject) return;

    const userMessage: ChatMessage = {
      id: uid("msg"),
      role: "user",
      content: text,
      timestamp: now(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setDraft("");
    setIsSending(true);

    // A conversation is created on first send, not on mount — so opening
    // /chat and never typing anything leaves no empty row behind. Once
    // created, its id is reused for the rest of this chat's lifetime.
    let activeConversationId = conversationId;
    if (!activeConversationId) {
      try {
        const conversation = await createConversation({ projectId: selectedProject });
        activeConversationId = conversation.conversationId;
        setConversationId(activeConversationId);
        setConversations((prev) => [conversation, ...prev]);
      } catch (error) {
        // Persistence is secondary to the chat actually working — log and
        // keep going without it rather than blocking the user's message.
        console.error(
          "[ChatShell] no se pudo crear la conversación:",
          error instanceof ConversationServiceError ? error.message : error,
        );
      }
    }

    if (activeConversationId) {
      void persistMessage(activeConversationId, { role: "user", content: text })
        .then(({ conversation }) => upsertConversation(conversation))
        .catch((error) => {
          console.error("[ChatShell] no se pudo guardar el mensaje del usuario:", error);
        });
    }

    try {
      const response = await sendChatMessage({
        message: text,
        projectId: selectedProject,
        mode: selectedAgent,
      });

      setMessages((prev) => [
        ...prev,
        {
          id: uid("msg"),
          role: "astrid",
          content: response.message,
          timestamp: now(),
          type: response.type,
          status: response.status,
          agent: response.agent,
          steps: response.steps,
          task: response.task,
        },
      ]);

      if (activeConversationId) {
        void persistMessage(activeConversationId, {
          role: "astrid",
          content: response.message,
          type: response.type,
          status: response.status,
          agent: response.agent,
          steps: response.steps,
          task: response.task,
        })
          .then(({ conversation }) => upsertConversation(conversation))
          .catch((error) => {
            console.error("[ChatShell] no se pudo guardar la respuesta de ASTRID:", error);
          });
      }
    } catch (error) {
      const errorContent =
        error instanceof ChatServiceError
          ? error.message
          : "Ocurrió un error inesperado al contactar a ASTRID.";

      setMessages((prev) => [
        ...prev,
        {
          id: uid("msg"),
          role: "astrid",
          content: errorContent,
          timestamp: now(),
          type: "development",
          status: "error",
        },
      ]);

      if (activeConversationId) {
        void persistMessage(activeConversationId, {
          role: "astrid",
          content: errorContent,
          type: "development",
          status: "error",
        })
          .then(({ conversation }) => upsertConversation(conversation))
          .catch((persistError) => {
            console.error("[ChatShell] no se pudo guardar el mensaje de error:", persistError);
          });
      }
    } finally {
      setIsSending(false);
    }
  }

  const lastAstridStatus = [...messages].reverse().find((m) => m.role === "astrid" && m.status)
    ?.status;
  const currentStatus = isSending ? "analyzing" : lastAstridStatus;
  const statusMeta = currentStatus ? chatOperationStatusMeta[currentStatus] : null;

  return (
    <div className="mx-auto flex h-[calc(100vh-4rem)] max-w-4xl flex-col px-4 py-6 md:px-8">
      <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        {conversations.length > 0 ? (
          <Select
            label="Conversación"
            value={conversationId ?? ""}
            options={conversations.map((conversation) => ({
              value: conversation.conversationId,
              label: conversationLabel(conversation),
            }))}
            onChange={handleSelectConversation}
            className="flex-1"
          />
        ) : (
          <div />
        )}
        <button
          type="button"
          onClick={handleNewConversation}
          className="flex h-10 shrink-0 items-center justify-center rounded-xl border border-border px-3.5 text-sm font-medium text-muted transition-colors hover:border-border-strong hover:text-foreground"
        >
          Nueva conversación
        </button>
      </div>

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="grid flex-1 grid-cols-2 gap-3">
          <Select
            label="Proyecto"
            value={selectedProject}
            options={
              projectOptions.length > 0
                ? projectOptions
                : [{ value: "", label: "Cargando proyectos..." }]
            }
            onChange={setSelectedProject}
          />
          <Select
            label="Modo / Agente"
            value={selectedAgent}
            options={agentOptions}
            onChange={setSelectedAgent}
          />
        </div>
        {statusMeta ? (
          <StatusBadge label={statusMeta.label} tone={statusMeta.tone} pulse={statusMeta.pulse} />
        ) : (
          <StatusBadge label="En espera" tone="muted" />
        )}
      </div>

      <div
        ref={scrollRef}
        className="flex-1 space-y-5 overflow-y-auto rounded-2xl border border-border bg-surface p-4 sm:p-5"
      >
        {isLoadingHistory && messages.length === 0 && (
          <p className="text-center text-sm text-muted-2">Cargando conversación...</p>
        )}
        {messages.map((message) => (
          <MessageBubble key={message.id} message={message} />
        ))}

        {isSending && (
          <div className="flex justify-start">
            <div className="flex items-center gap-2 rounded-2xl rounded-tl-sm border border-border bg-surface-2 px-4 py-3 text-sm text-muted">
              <span className="flex gap-1" aria-hidden="true">
                <span className="h-1.5 w-1.5 animate-pulse-soft rounded-full bg-gold" />
                <span className="h-1.5 w-1.5 animate-pulse-soft rounded-full bg-gold [animation-delay:0.15s]" />
                <span className="h-1.5 w-1.5 animate-pulse-soft rounded-full bg-gold [animation-delay:0.3s]" />
              </span>
              Esperando respuesta de OpenClaw...
            </div>
          </div>
        )}
      </div>

      <form
        onSubmit={(event) => {
          event.preventDefault();
          void handleSend();
        }}
        className="mt-4 flex items-end gap-3 rounded-2xl border border-border bg-surface-2 p-3"
      >
        <textarea
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault();
              void handleSend();
            }
          }}
          placeholder="Escribe una instrucción para ASTRID..."
          rows={2}
          disabled={isSending}
          className="max-h-40 flex-1 resize-none bg-transparent text-sm text-foreground placeholder:text-muted-2 focus:outline-none disabled:opacity-60"
        />
        <button
          type="submit"
          disabled={!draft.trim() || isSending || !selectedProject}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gold text-gold-foreground transition-opacity hover:opacity-90 disabled:opacity-40"
          aria-label="Enviar"
        >
          <SendIcon className="h-4 w-4" aria-hidden="true" />
        </button>
      </form>
    </div>
  );
}
