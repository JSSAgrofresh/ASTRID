"use client";

import { GlobeIcon, LockIcon } from "@/components/icons";
import { Card } from "@/components/ui/Card";
import { StatusBadge } from "@/components/ui/StatusBadge";
import type { GithubRepoSummary } from "@/lib/types";

const LOCAL_STATUS_META = {
  not_cloned: { label: "No clonado", tone: "muted" as const },
  cloned: { label: "Clonado (sin registrar)", tone: "warning" as const },
  registered: { label: "En SANAI", tone: "success" as const },
};

interface GithubRepoCardProps {
  repo: GithubRepoSummary;
  onAdd: (repo: GithubRepoSummary) => void;
  isBusy: boolean;
}

export function GithubRepoCard({ repo, onAdd, isBusy }: GithubRepoCardProps) {
  const statusMeta = LOCAL_STATUS_META[repo.localStatus];
  const canAdd = repo.localStatus !== "registered";

  return (
    <Card className="p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate text-[15px] font-semibold text-foreground">{repo.repoName}</h3>
          <p className="mt-0.5 truncate text-xs text-muted">{repo.fullName}</p>
        </div>
        <StatusBadge label={statusMeta.label} tone={statusMeta.tone} />
      </div>

      {repo.description && (
        <p className="mt-3 line-clamp-2 text-sm text-muted">{repo.description}</p>
      )}

      <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-muted">
        <span className="flex items-center gap-1.5">
          {repo.isPrivate ? <LockIcon className="h-3.5 w-3.5" /> : <GlobeIcon className="h-3.5 w-3.5" />}
          {repo.isPrivate ? "Privado" : "Público"}
        </span>
        <span>Rama principal: {repo.defaultBranch}</span>
        {repo.isFork && <span>Fork</span>}
      </div>

      <div className="mt-4 border-t border-border pt-3">
        <button
          type="button"
          disabled={!canAdd || isBusy}
          onClick={() => onAdd(repo)}
          className="w-full rounded-xl bg-gold py-2 text-sm font-medium text-gold-foreground transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {repo.localStatus === "registered"
            ? "Ya está en SANAI"
            : isBusy
              ? "Agregando..."
              : "Agregar a SANAI"}
        </button>
      </div>
    </Card>
  );
}
