import { existsSync } from "node:fs";
import * as git from "./git-service";
import { createPullRequest } from "./github-service";
import { classifyChangeType } from "./task-runner";
import { getTask, updateTask, type StoredTask } from "./task-store";

/**
 * Approve/reject an already-created edit task (see `task-runner.ts` for
 * how the task itself gets created). This is the ONLY place ASTRID ever
 * commits, pushes, or opens a PR — and it re-validates everything from
 * scratch rather than trusting the stored record, because time has passed
 * since the task was created and the human is only now saying "go".
 *
 * NEVER performed here, by construction (no such function exists in
 * `git-service.ts`/`github-service.ts` to call): --amend, reset, clean,
 * force-push, merge, remote branch deletion.
 */

const SECRET_FILE_PATTERN = /(^|\/)\.env(\..+)?$|(^|\/)secrets?(\/|$)|\.pem$|\.key$/i;

export type ApprovalOutcome =
  | { ok: true; task: StoredTask }
  | { ok: false; task: StoredTask; reason: string };

function summarize(instruction: string, maxLen = 60): string {
  const firstSentence = instruction.split(/[.\n]/)[0]?.trim() || instruction.trim();
  return firstSentence.length > maxLen ? `${firstSentence.slice(0, maxLen - 1)}…` : firstSentence;
}

function buildCommitMessage(task: StoredTask): string {
  const header = `${classifyChangeType(task.instruction)}(astrid): ${summarize(task.instruction)}`;
  const body = task.filesChanged.map((f) => `- ${f}`).join("\n");
  return `${header}\n\n${body}\n\nGenerado por ASTRID (branch: ${task.taskBranch}).`;
}

function buildPrTitle(task: StoredTask): string {
  return `${classifyChangeType(task.instruction)}: ${summarize(task.instruction)}`;
}

function buildPrBody(task: StoredTask): string {
  const validationLine = (label: string, value: string | undefined) =>
    `- ${label}: ${value === "passed" ? "✓ correcto" : value === "failed" ? "✗ con errores" : "no ejecutado"}`;

  return [
    "## Resumen",
    task.instruction,
    "",
    "## Cambios",
    ...task.filesChanged.map((f) => `- ${f}`),
    "",
    "## Validaciones",
    validationLine("Lint", task.validations.lint),
    validationLine("Tests", task.validations.test),
    validationLine("Build", task.validations.build),
    "",
    "## Generado por",
    "ASTRID — revisado y aprobado por un humano antes de publicarse. Sin merge automático.",
  ].join("\n");
}

/**
 * Re-checks everything requirement #4 asks for, from scratch, using the
 * live filesystem/Git state — never the stored snapshot alone.
 */
async function reverifyBeforeCommit(task: StoredTask): Promise<string | null> {
  if (!existsSync(task.worktreeDir)) return "El worktree de esta tarea ya no existe en disco.";

  const branchResult = await git.getCurrentBranch(task.worktreeDir);
  if (!branchResult.ok) return "No se pudo confirmar la branch actual del worktree.";
  const currentBranch = branchResult.stdout.trim();
  if (currentBranch !== task.taskBranch) {
    return `La branch del worktree cambió inesperadamente (esperada "${task.taskBranch}", encontrada "${currentBranch}").`;
  }
  if (currentBranch === "main" || currentBranch === "master") {
    return "La branch resuelta es main/master — abortado por seguridad.";
  }

  const filesNow = await git.getChangedFiles(task.worktreeDir);
  if (filesNow.length === 0) return "Ya no hay cambios en el worktree (¿se perdieron o ya se confirmaron?).";

  const originalSet = new Set(task.filesChanged);
  const nowSet = new Set(filesNow);
  const unexpected = filesNow.filter((f) => !originalSet.has(f));
  const missing = task.filesChanged.filter((f) => !nowSet.has(f));
  if (unexpected.length > 0 || missing.length > 0) {
    return `El conjunto de archivos modificados cambió respecto a lo revisado (nuevos: ${unexpected.join(", ") || "ninguno"}; ya no presentes: ${missing.join(", ") || "ninguno"}). Deteniéndome por seguridad.`;
  }

  const secretTouched = filesNow.find((f) => SECRET_FILE_PATTERN.test(f));
  if (secretTouched) return `El archivo "${secretTouched}" parece un secreto/.env — ASTRID no confirma cambios que lo toquen.`;

  return null;
}

export async function approveTask(taskId: string): Promise<ApprovalOutcome> {
  const task = getTask(taskId);
  if (!task) throw new Error("task_not_found");

  if (task.status !== "pending_review") {
    return { ok: false, task, reason: `La tarea no está pendiente de revisión (estado actual: "${task.status}").` };
  }

  const reverifyError = await reverifyBeforeCommit(task);
  if (reverifyError) {
    const updated = updateTask(taskId, { status: "error", errorDetail: reverifyError })!;
    return { ok: false, task: updated, reason: reverifyError };
  }

  updateTask(taskId, { status: "approved", approvedAt: new Date().toISOString() });

  const staged = await git.stageAll(task.worktreeDir);
  if (!staged.ok) {
    const updated = updateTask(taskId, { status: "error", errorDetail: `git add falló: ${staged.stderr.slice(0, 300)}` })!;
    return { ok: false, task: updated, reason: updated.errorDetail! };
  }

  const commitResult = await git.commit(task.worktreeDir, buildCommitMessage(task));
  if (!commitResult.ok) {
    const detail = `git commit falló: ${commitResult.stderr.slice(0, 300)}`;
    console.error("[task-approval]", detail);
    const updated = updateTask(taskId, { status: "error", errorDetail: detail })!;
    return { ok: false, task: updated, reason: detail };
  }

  const shaResult = await git.getHeadSha(task.worktreeDir);
  const commitSha = shaResult.ok ? shaResult.stdout.trim() : undefined;
  updateTask(taskId, { status: "committed", commitSha });

  const pushResult = await git.pushBranch(task.worktreeDir, task.taskBranch);
  if (!pushResult.ok) {
    const detail = `Commit creado (${commitSha ?? "sha desconocido"}), pero git push falló: ${pushResult.stderr.slice(0, 400)}`;
    console.error("[task-approval]", detail);
    const updated = updateTask(taskId, { status: "error", errorDetail: detail, commitSha })!;
    return { ok: false, task: updated, reason: detail };
  }

  const remoteConfirm = await git.remoteBranchExists(task.worktreeDir, task.taskBranch);
  if (!remoteConfirm.ok) {
    const detail = "git push no reportó error, pero ASTRID no pudo confirmar la branch en el remoto (git ls-remote).";
    console.error("[task-approval]", detail);
    const updated = updateTask(taskId, { status: "error", errorDetail: detail, commitSha })!;
    return { ok: false, task: updated, reason: detail };
  }

  updateTask(taskId, { status: "pushed", pushedAt: new Date().toISOString() });

  const prResult = await createPullRequest({
    cwd: task.worktreeDir,
    title: buildPrTitle(task),
    body: buildPrBody(task),
    base: task.baseBranch,
    head: task.taskBranch,
  });

  if (!prResult.ok) {
    const detail = `Branch publicada, pero no se pudo crear el Pull Request: ${prResult.detail}`;
    console.error("[task-approval]", detail);
    const updated = updateTask(taskId, { status: "error", errorDetail: detail, commitSha })!;
    return { ok: false, task: updated, reason: detail };
  }

  const finalTask = updateTask(taskId, { status: "pr_created", prUrl: prResult.url, commitSha })!;
  return { ok: true, task: finalTask };
}

export function rejectTask(taskId: string): StoredTask {
  const task = getTask(taskId);
  if (!task) throw new Error("task_not_found");
  if (task.status !== "pending_review") {
    return task;
  }
  return updateTask(taskId, { status: "rejected" })!;
}
