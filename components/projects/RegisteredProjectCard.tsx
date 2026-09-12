import { BranchIcon, GlobeIcon, LockIcon } from "@/components/icons";
import { Card } from "@/components/ui/Card";
import { StatusBadge } from "@/components/ui/StatusBadge";
import type { PublicProject } from "@/lib/types";

function relativeTime(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diffMs / 60_000);
  if (minutes < 1) return "hace instantes";
  if (minutes < 60) return `hace ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `hace ${hours} h`;
  const days = Math.floor(hours / 24);
  return `hace ${days} d`;
}

/**
 * Card for a project already registered with ANAI (real SQLite data via
 * `PublicProject` — never a filesystem path, since that type never has one).
 */
export function RegisteredProjectCard({ project }: { project: PublicProject }) {
  return (
    <Card className="p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-[15px] font-semibold text-foreground">{project.displayName}</h3>
          <p className="mt-0.5 text-xs text-muted">{project.fullName}</p>
        </div>
        <StatusBadge label="Registrado" tone="success" />
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-muted">
        <span className="flex items-center gap-1.5">
          <BranchIcon className="h-3.5 w-3.5" />
          {project.defaultBranch}
        </span>
        <span className="flex items-center gap-1.5">
          {project.visibility === "private" ? (
            <LockIcon className="h-3.5 w-3.5" />
          ) : (
            <GlobeIcon className="h-3.5 w-3.5" />
          )}
          {project.visibility === "private" ? "Privado" : "Público"}
        </span>
      </div>

      <div className="mt-4 border-t border-border pt-3 text-xs text-muted">
        Última actividad: {relativeTime(project.updatedAt)}
      </div>
    </Card>
  );
}
