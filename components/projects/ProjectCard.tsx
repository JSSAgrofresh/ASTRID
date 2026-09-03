import Link from "next/link";
import { BranchIcon, PullRequestIcon } from "@/components/icons";
import { Card } from "@/components/ui/Card";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { projectStatusMeta } from "@/lib/status";
import type { Project } from "@/lib/types";

interface ProjectCardProps {
  project: Project;
  detailed?: boolean;
}

export function ProjectCard({ project, detailed = false }: ProjectCardProps) {
  const status = projectStatusMeta[project.status];

  return (
    <Card interactive className="p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-[15px] font-semibold text-foreground">
            {project.name}
          </h3>
          <p className="mt-0.5 text-xs text-muted">{project.repo}</p>
        </div>
        <StatusBadge label={status.label} tone={status.tone} pulse={status.pulse} />
      </div>

      {detailed && (
        <p className="mt-3 text-sm text-muted">{project.description}</p>
      )}

      <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-muted">
        <span className="flex items-center gap-1.5">
          <BranchIcon className="h-3.5 w-3.5" />
          {project.branch}
        </span>
        <span className="flex items-center gap-1.5">
          <PullRequestIcon className="h-3.5 w-3.5" />
          {project.openPullRequests} PR pendientes
        </span>
      </div>

      <div className="mt-4">
        <ProgressBar value={project.progress} label="Progreso" />
      </div>

      <div className="mt-4 flex items-center justify-between border-t border-border pt-3 text-xs">
        <span className="text-muted">
          {project.pendingTasks} tareas pendientes · {project.lastActivity}
        </span>
        {detailed && (
          <Link
            href="/chat"
            className="font-medium text-gold-ink transition-colors hover:opacity-80"
          >
            Abrir en Chat →
          </Link>
        )}
      </div>

      {detailed && (
        <p className="mt-3 truncate rounded-lg border border-border bg-surface-2 px-3 py-2 font-mono text-[11px] text-muted">
          {project.lastCommit}
        </p>
      )}
    </Card>
  );
}
