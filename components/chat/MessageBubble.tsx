import { ApprovalCard } from "@/components/chat/ApprovalCard";
import { StepTimeline } from "@/components/chat/StepTimeline";
import type { ChatMessage } from "@/lib/types";

export function MessageBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === "user";
  const isDevelopment = !isUser && message.type === "development";

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div className={`max-w-[85%] sm:max-w-[70%] ${isUser ? "items-end" : "items-start"} flex flex-col`}>
        <div
          className={`rounded-2xl px-4 py-3 text-sm leading-relaxed ${
            isUser
              ? "rounded-tr-sm bg-gold text-gold-foreground"
              : isDevelopment
                ? "rounded-tl-sm border border-gold/25 bg-surface-2 text-foreground"
                : "rounded-tl-sm border border-border bg-surface-2 text-foreground"
          }`}
        >
          {!isUser && (
            <div className="mb-1 flex items-center gap-2">
              <p className="text-xs font-semibold text-gold-ink">
                {isDevelopment ? "SANAI · Tarea" : "SANAI"}
              </p>
              {isDevelopment && message.agent && (
                <span className="rounded-full border border-border px-1.5 py-0.5 text-[10px] text-muted">
                  {message.agent}
                </span>
              )}
            </div>
          )}
          <p className="whitespace-pre-wrap">{message.content}</p>
        </div>
        <span className="mt-1 px-1 text-[11px] text-muted-2">{message.timestamp}</span>

        {isDevelopment && message.steps && message.steps.length > 0 && (
          <div className="w-full min-w-[260px]">
            <StepTimeline steps={message.steps} />
          </div>
        )}

        {isDevelopment && message.task && (
          <div className="w-full min-w-[260px]">
            <ApprovalCard task={message.task} />
          </div>
        )}
      </div>
    </div>
  );
}
