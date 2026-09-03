import type { ReactNode } from "react";
import { Card } from "@/components/ui/Card";

interface StatCardProps {
  label: string;
  value: string;
  hint?: string;
  icon: ReactNode;
  tone?: "gold" | "neutral";
}

export function StatCard({ label, value, hint, icon, tone = "neutral" }: StatCardProps) {
  return (
    <Card className="p-5">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-muted-2">
            {label}
          </p>
          <p className="mt-2 text-2xl font-semibold tracking-tight text-foreground">
            {value}
          </p>
          {hint && <p className="mt-1 text-xs text-muted">{hint}</p>}
        </div>
        <div
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border ${
            tone === "gold"
              ? "border-gold/30 bg-gold-dim text-gold-light"
              : "border-border text-muted"
          }`}
        >
          {icon}
        </div>
      </div>
    </Card>
  );
}
