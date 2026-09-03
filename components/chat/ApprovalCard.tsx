"use client";

import { useState } from "react";
import { BranchIcon, ChevronDownIcon, DiffIcon } from "@/components/icons";
import { DiffView } from "@/components/chat/DiffView";
import { Card } from "@/components/ui/Card";
import { StatusBadge, type StatusTone } from "@/components/ui/StatusBadge";
import { respondToTask, TaskServiceError } from "@/lib/task-service";
import type { PublicTask, TaskValidations } from "@/lib/types";

function validationMeta(result: TaskValidations[keyof TaskValidations]): { label: string; tone: StatusTone } {
  if (result === "passed") return { label: "Correcto", tone: "success" };
  if (result === "failed") return { label: "Con errores", tone: "danger" };
  return { label: "No ejecutado", tone: "muted" };
}

function ValidationRow({ label, result }: { label: string; result?: TaskValidations[keyof TaskValidations] }) {
  const meta = validationMeta(result);
  return (
    <div className="flex items-center justify-between py-1 text-sm">
      <span className="text-muted">{label}</span>
      <StatusBadge label={meta.label} tone={meta.tone} />
    </div>
  );
}

function ChecklistRow({ label, done, error }: { label: string; done: boolean; error?: boolean }) {
  return (
    <li className={`flex items-center gap-2 text-sm ${error ? "text-danger" : done ? "text-foreground" : "text-muted-2"}`}>
      <span
        className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full ${
          error ? "bg-danger-dim text-danger" : done ? "bg-success-dim text-success" : "border border-border-strong"
        }`}
        aria-hidden="true"
      >
        {(done || error) && (error ? "!" : "✓")}
      </span>
      {label}
    </li>
  );
}

export function ApprovalCard({ task: initialTask }: { task: PublicTask }) {
  const [task, setTask] = useState(initialTask);
  const [busy, setBusy] = useState<"approve" | "reject" | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [showDiff, setShowDiff] = useState(false);

  const warnings: string[] = [];
  if (task.validations.lint === "failed") warnings.push("El lint reportó errores en este cambio.");
  if (task.validations.test === "failed") warnings.push("Los tests fallaron con este cambio.");
  if (task.validations.build === "failed") warnings.push("El build falló con este cambio.");

  async function handleAction(action: "approve" | "reject") {
    setBusy(action);
    setActionError(null);
    try {
      const result = await respondToTask(task.taskId, action);
      setTask(result.task);
      if (!result.ok && result.error) setActionError(result.error);
    } catch (error) {
      setActionError(error instanceof TaskServiceError ? error.message : "Ocurrió un error inesperado.");
    } finally {
      setBusy(null);
    }
  }

  const isPending = task.status === "pending_review";
  const isRejected = task.status === "rejected";
  const showChecklist = !isPending && !isRejected;

  return (
    <Card className="mt-1 overflow-hidden border-gold/25">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border bg-surface-2 px-4 py-3">
        <div className="flex items-center gap-2">
          <BranchIcon className="h-4 w-4 text-gold" aria-hidden="true" />
          <div>
            <p className="font-mono text-xs font-medium text-gold-ink">{task.taskBranch}</p>
            <p className="text-[11px] text-muted-2">{task.projectName} · desde {task.baseBranch}</p>
          </div>
        </div>
        <StatusBadge
          label={
            isPending ? "Pendiente de revisión" :
            isRejected ? "Rechazada" :
            task.status === "pr_created" ? "Pull Request creado" :
            task.status === "error" ? "Con errores" :
            task.status
          }
          tone={isPending ? "warning" : isRejected ? "muted" : task.status === "pr_created" ? "success" : task.status === "error" ? "danger" : "gold"}
        />
      </div>

      <div className="border-b border-border px-4 py-3">
        <p className="mb-1.5 text-[11px] font-medium uppercase tracking-wider text-muted-2">
          Archivos modificados ({task.filesChanged.length})
        </p>
        <ul className="space-y-0.5">
          {task.filesChanged.map((file) => (
            <li key={file} className="truncate font-mono text-xs text-muted">
              {file}
            </li>
          ))}
        </ul>
        {task.diffStat && (
          <p className="mt-2 whitespace-pre-wrap font-mono text-[11px] text-muted-2">{task.diffStat}</p>
        )}
        <button
          type="button"
          onClick={() => setShowDiff((v) => !v)}
          className="mt-2 flex items-center gap-1.5 text-xs font-medium text-gold-ink hover:opacity-80"
        >
          <DiffIcon className="h-3.5 w-3.5" aria-hidden="true" />
          {showDiff ? "Ocultar diff completo" : "Ver diff completo"}
          <ChevronDownIcon className={`h-3.5 w-3.5 transition-transform ${showDiff ? "rotate-180" : ""}`} aria-hidden="true" />
        </button>
        {showDiff && (
          <div className="mt-2 rounded-lg border border-border bg-surface-2">
            <DiffView diff={task.diff} />
          </div>
        )}
      </div>

      <div className="border-b border-border px-4 py-3">
        <p className="mb-1 text-[11px] font-medium uppercase tracking-wider text-muted-2">Validaciones</p>
        <ValidationRow label="Lint" result={task.validations.lint} />
        <ValidationRow label="Tests" result={task.validations.test} />
        <ValidationRow label="Build" result={task.validations.build} />
      </div>

      {warnings.length > 0 && (
        <div className="border-b border-border bg-warning-dim px-4 py-2.5">
          {warnings.map((w) => (
            <p key={w} className="text-xs text-warning">⚠ {w}</p>
          ))}
        </div>
      )}

      {(actionError || task.errorDetail) && (
        <p className="border-b border-border bg-danger-dim px-4 py-2.5 text-xs text-danger">
          {actionError ?? task.errorDetail}
        </p>
      )}

      {showChecklist && (
        <ul className="space-y-1.5 border-b border-border px-4 py-3">
          <ChecklistRow label="Commit creado" done={Boolean(task.commitSha)} error={task.status === "error" && !task.commitSha} />
          <ChecklistRow label="Branch publicada" done={Boolean(task.pushedAt)} error={task.status === "error" && Boolean(task.commitSha) && !task.pushedAt} />
          <ChecklistRow label="Pull Request creado" done={Boolean(task.prUrl)} error={task.status === "error" && Boolean(task.pushedAt) && !task.prUrl} />
        </ul>
      )}

      <div className="flex flex-wrap items-center gap-2 px-4 py-3">
        {isPending && (
          <>
            <button
              type="button"
              onClick={() => handleAction("approve")}
              disabled={busy !== null}
              className="rounded-lg bg-gold px-3.5 py-2 text-sm font-medium text-gold-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
            >
              {busy === "approve" ? "Aprobando y publicando..." : "Aprobar y crear PR"}
            </button>
            <button
              type="button"
              onClick={() => handleAction("reject")}
              disabled={busy !== null}
              className="rounded-lg border border-border px-3.5 py-2 text-sm font-medium text-muted transition-colors hover:border-border-strong hover:text-foreground disabled:opacity-50"
            >
              {busy === "reject" ? "Rechazando..." : "Rechazar cambios"}
            </button>
          </>
        )}

        {task.prUrl && (
          <a
            href={task.prUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-lg bg-gold px-3.5 py-2 text-sm font-medium text-gold-foreground transition-opacity hover:opacity-90"
          >
            Abrir Pull Request →
          </a>
        )}

        {isRejected && <p className="text-sm text-muted">Cambios rechazados. El worktree se conserva por ahora.</p>}
      </div>
    </Card>
  );
}
