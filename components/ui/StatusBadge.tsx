export type StatusTone = "gold" | "success" | "danger" | "warning" | "muted";

const toneStyles: Record<StatusTone, string> = {
  gold: "bg-gold-dim text-gold-ink border-gold/30",
  success: "bg-success-dim text-success border-success/30",
  danger: "bg-danger-dim text-danger border-danger/30",
  warning: "bg-warning-dim text-warning border-warning/30",
  muted: "bg-surface-3 text-muted border-border-strong",
};

interface StatusBadgeProps {
  label: string;
  tone: StatusTone;
  pulse?: boolean;
}

export function StatusBadge({ label, tone, pulse }: StatusBadgeProps) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium ${toneStyles[tone]}`}
    >
      <span
        className={`h-1.5 w-1.5 rounded-full bg-current ${pulse ? "animate-pulse-soft" : ""}`}
      />
      {label}
    </span>
  );
}
