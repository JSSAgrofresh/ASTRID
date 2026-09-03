"use client";

import { useEffect, useRef, useState } from "react";
import { SendIcon } from "@/components/icons";
import { MessageBubble } from "@/components/chat/MessageBubble";
import { Select } from "@/components/ui/Select";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { agents, initialChatMessages, projects } from "@/lib/data";
import { ChatServiceError, sendChatMessage } from "@/lib/chat-service";
import { chatOperationStatusMeta } from "@/lib/status";
import type { ChatMessage } from "@/lib/types";

const projectOptions = projects.map((project) => ({
  value: project.id,
  label: project.name,
}));

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

export function ChatShell() {
  const [selectedProject, setSelectedProject] = useState(projectOptions[0].value);
  const [selectedAgent, setSelectedAgent] = useState(agentOptions[0].value);
  const [messages, setMessages] = useState<ChatMessage[]>(initialChatMessages);
  const [draft, setDraft] = useState("");
  const [isSending, setIsSending] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, isSending]);

  async function handleSend() {
    const text = draft.trim();
    if (!text || isSending) return;

    const userMessage: ChatMessage = {
      id: uid("msg"),
      role: "user",
      content: text,
      timestamp: now(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setDraft("");
    setIsSending(true);

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
    } catch (error) {
      setMessages((prev) => [
        ...prev,
        {
          id: uid("msg"),
          role: "astrid",
          content:
            error instanceof ChatServiceError
              ? error.message
              : "Ocurrió un error inesperado al contactar a ASTRID.",
          timestamp: now(),
          type: "development",
          status: "error",
        },
      ]);
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
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="grid flex-1 grid-cols-2 gap-3">
          <Select
            label="Proyecto"
            value={selectedProject}
            options={projectOptions}
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
          disabled={!draft.trim() || isSending}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gold text-gold-foreground transition-opacity hover:opacity-90 disabled:opacity-40"
          aria-label="Enviar"
        >
          <SendIcon className="h-4 w-4" aria-hidden="true" />
        </button>
      </form>
    </div>
  );
}
