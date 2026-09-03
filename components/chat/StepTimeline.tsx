import { CheckIcon } from "@/components/icons";
import { chatStepStatusMeta } from "@/lib/status";
import type { ChatStep } from "@/lib/types";

function StepIndicator({ status }: { status: ChatStep["status"] }) {
  if (status === "completed") {
    return (
      <span
        aria-hidden="true"
        className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-success-dim text-success"
      >
        <CheckIcon className="h-3 w-3" strokeWidth={2.5} aria-hidden="true" />
      </span>
    );
  }

  if (status === "running") {
    return (
      <span aria-hidden="true" className="flex h-4 w-4 shrink-0 items-center justify-center">
        <span className="h-2 w-2 rounded-full bg-gold animate-pulse-soft" />
      </span>
    );
  }

  if (status === "error") {
    return (
      <span aria-hidden="true" className="flex h-4 w-4 shrink-0 items-center justify-center">
        <span className="h-2 w-2 rounded-full bg-danger" />
      </span>
    );
  }

  return (
    <span aria-hidden="true" className="flex h-4 w-4 shrink-0 items-center justify-center">
      <span className="h-2 w-2 rounded-full border border-muted-2" />
    </span>
  );
}

const textTone: Record<ChatStep["status"], string> = {
  completed: "text-muted",
  running: "text-gold-ink font-medium",
  error: "text-danger",
  pending: "text-muted-2",
};

function StepRow({ step }: { step: ChatStep }) {
  const meta = chatStepStatusMeta[step.status];

  return (
    <li className={`flex items-center gap-2.5 text-sm ${textTone[step.status]}`}>
      <StepIndicator status={step.status} />
      <span className="flex-1">{step.label}</span>
      <span className="sr-only">{meta.label}</span>
    </li>
  );
}

export function StepTimeline({ steps }: { steps: ChatStep[] }) {
  return (
    <ul className="mt-3 space-y-2 rounded-xl border border-border bg-surface-2 p-3.5">
      {steps.map((step, index) => (
        <StepRow key={`${index}-${step.label}`} step={step} />
      ))}
    </ul>
  );
}
