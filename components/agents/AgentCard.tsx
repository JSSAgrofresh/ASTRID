import { Card } from "@/components/ui/Card";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { agentStatusMeta } from "@/lib/status";
import type { Agent } from "@/lib/types";

export function AgentCard({ agent }: { agent: Agent }) {
  const status = agentStatusMeta[agent.status];
  const initials = agent.name.slice(0, 2).toUpperCase();

  return (
    <Card interactive className="p-5">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-gold/25 bg-gold-dim text-sm font-semibold text-gold-ink">
            {initials}
          </div>
          <div>
            <h3 className="text-[15px] font-semibold text-foreground">{agent.name}</h3>
            <p className="text-xs text-muted">{agent.role}</p>
          </div>
        </div>
        <StatusBadge label={status.label} tone={status.tone} pulse={status.pulse} />
      </div>

      <div className="mt-4 space-y-2 border-t border-border pt-3 text-xs">
        <div className="flex items-center justify-between">
          <span className="text-muted-2">Tarea actual</span>
          <span className="text-right text-foreground">
            {agent.currentTask ?? "Sin asignar"}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-muted-2">Modelo asignado</span>
          <span className="text-foreground">{agent.model}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-muted-2">Última actividad</span>
          <span className="text-muted">{agent.lastActivity}</span>
        </div>
      </div>
    </Card>
  );
}
