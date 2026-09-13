import { execFile } from "node:child_process";
import { existsSync, readFileSync, symlinkSync } from "node:fs";
import path from "node:path";
import { projects } from "@/lib/data";
import type { ChatResponse, ChatStep, TaskValidations } from "@/lib/types";
import * as git from "./git-service";
import { askOpenClaw } from "./openclaw-client";
import {
  pointDeveloperSandboxAt,
  stripOpenClawBootstrapArtifacts,
  DEVELOPER_AGENT_ID,
  DEVELOPER_SANDBOX_WORKSPACE,
} from "./sandbox-service";
import { newTaskId, saveTask, toPublicTask, type StoredTask } from "./task-store";
import { getTaskWorktreePath, resolveProjectWorkspace } from "./workspace";

/**
 * Orchestrates one isolated Git edit task:
 *
 *   validate project/workspace → check Git is clean → create an isolated
 *   worktree on a brand-new branch → point the sandboxed "developer"
 *   OpenClaw agent's Docker container at that worktree → ask it to make
 *   the content edit *inside that container only* → verify real changes on
 *   disk (never trust the model's claim alone) → run lint/build if
 *   available → return a step-by-step, honest summary.
 *
 * Security model (two layers, and this file is honest with itself about
 * which is which):
 *
 * 1. HARD boundary — this file's own Git calls. `git-service.ts` exposes
 *    only fixed-subcommand functions (status, branch check, worktree add,
 *    diff, read-only remote check). There is no push/merge/reset/clean
 *    function to call, so this file structurally cannot perform them.
 *
 * 2. HARD boundary (as of the "developer" sandbox) — the edit itself runs
 *    inside a Docker container (`agents.entries.developer.sandbox`,
 *    `mode: all`, `network: none`, `readOnlyRoot: true`, `capDrop: [ALL]`
 *    — all confirmed live via `openclaw sandbox explain --agent
 *    developer`) whose ONLY mount is this task's worktree at `/workspace`.
 *    It cannot see `/home/kokes`, other projects, `~/.openclaw` (tokens,
 *    other worktrees), `~/.ssh`, `~/.config/gh`, `/mnt/c`, or the Docker
 *    socket — those simply are not mounted. `pointDeveloperSandboxAt`
 *    below repoints and recreates that container for every task, so it
 *    never retains a previous task's mount. The orchestrating "main" agent
 *    is never asked to edit anything and keeps `sandbox: off` — it never
 *    touches the host directly either way. `remoteBranchExists` below
 *    still independently verifies — after the fact — that the task branch
 *    was never pushed (push/commit/PR happen only in
 *    `task-approval-service.ts`, entirely outside the sandbox).
 */

const EDIT_TIMEOUT_MS = 150_000;
const LINT_TIMEOUT_MS = 120_000;
const BUILD_TIMEOUT_MS = 180_000;
const TEST_TIMEOUT_MS = 150_000;
const INSTALL_TIMEOUT_MS = 240_000;

export interface EditTaskRequest {
  message: string;
  projectId: string;
}

// --- Intent classification ---------------------------------------------
// Deliberately conservative: requires an explicit edit verb *and* a signal
// that this is about a branch/file/code/line, not just "tell me about the
// project". Misclassifying an edit as analysis is safe (user just gets a
// read-only answer); misclassifying analysis as an edit is not (it creates
// a branch/worktree and runs installs), so this errs toward under-firing.
const EDIT_VERB = /\b(crea|crear|cambia|cambiar|modifica|modificar|reemplaza|reemplazar|edita|editar|corrige|corregir|arregla|arreglar|actualiza|actualizar|agrega|agregar|añade|añadir|sustituye|sustituir)\b/i;
const EDIT_TARGET_SIGNAL = /\b(branch|rama|texto|archivo|código|linea|línea)\b/i;

export function isEditTaskRequest(message: string): boolean {
  return EDIT_VERB.test(message) && EDIT_TARGET_SIGNAL.test(message);
}

// --- Branch naming --------------------------------------------------------

export function classifyChangeType(message: string): "fix" | "feat" | "chore" {
  const m = message.toLowerCase();
  if (/\b(arregla|arreglar|corrige|corregir|bug|error)\b/.test(m)) return "fix";
  if (/\b(agrega|agregar|añade|añadir|crea|crear|implementa|implementar|nuevo|nueva)\b/.test(m)) return "feat";
  return "chore";
}

const ACCENTED_CHAR_MAP: Record<string, string> = {
  á: "a", é: "e", í: "i", ó: "o", ú: "u", ü: "u", ñ: "n",
};

function stripAccents(text: string): string {
  return text.replace(/[áéíóúüñ]/g, (char) => ACCENTED_CHAR_MAP[char] ?? char);
}

function slugify(text: string): string {
  const cleaned = stripAccents(text.toLowerCase())
    .replace(/[^a-z0-9\s-]/g, " ")
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 6)
    .join("-");
  return (cleaned || "tarea").slice(0, 50);
}

async function buildBranchName(repoDir: string, message: string, taskId: string): Promise<string> {
  const candidate = `astrid/${classifyChangeType(message)}/${slugify(message)}`;
  if (!(await git.branchExists(repoDir, candidate))) return candidate;
  return `${candidate}-${taskId.slice(-6)}`;
}

// --- Dependencies + validations --------------------------------------------

function runCommand(bin: string, args: string[], cwd: string, timeoutMs: number): Promise<{ ok: boolean; stdout: string; stderr: string }> {
  return new Promise((resolve) => {
    execFile(
      /* turbopackIgnore: true */ bin,
      args,
      { cwd, timeout: timeoutMs, maxBuffer: 20 * 1024 * 1024 },
      (error, stdout, stderr) => resolve({ ok: !error, stdout, stderr }),
    );
  });
}

function hasNpmScript(dir: string, script: string): boolean {
  try {
    const pkg = JSON.parse(readFileSync(path.join(dir, "package.json"), "utf8")) as { scripts?: Record<string, string> };
    return Boolean(pkg.scripts?.[script]);
  } catch {
    return false;
  }
}

/** Links (or installs) node_modules into the worktree so lint/build/test binaries resolve. */
async function ensureDependencies(mainWorkspace: string, worktreeDir: string): Promise<boolean> {
  if (!existsSync(path.join(worktreeDir, "package.json"))) return true; // not a Node project; nothing to do

  const mainModules = path.join(mainWorkspace, "node_modules");
  const worktreeModules = path.join(worktreeDir, "node_modules");

  if (existsSync(worktreeModules)) return true;

  if (existsSync(mainModules)) {
    try {
      symlinkSync(mainModules, worktreeModules, "dir");
      return true;
    } catch (error) {
      console.error("[task-runner] no se pudo enlazar node_modules, intentando npm install:", error);
    }
  }

  const install = await runCommand("npm", ["install"], worktreeDir, INSTALL_TIMEOUT_MS);
  if (!install.ok) console.error("[task-runner] npm install falló:", install.stderr.slice(0, 500));
  return install.ok;
}

// --- OpenClaw edit prompt ---------------------------------------------

function buildEditContext(projectName: string, branch: string): string {
  return [
    "Contexto de SANAI:",
    `- Proyecto: ${projectName}`,
    `- Workspace de trabajo para ESTA tarea (worktree Git aislado, en la branch "${branch}", creada por el servidor): ${DEVELOPER_SANDBOX_WORKSPACE}`,
    "- Estás corriendo dentro de un contenedor Docker aislado (sandbox) que solo tiene montado ese worktree. No hay red, ni acceso al resto del host, ni a otros proyectos, ni a credenciales.",
    "",
    "Política de esta etapa — EDICIÓN AISLADA, SOLO EN ESTE WORKTREE:",
    "- Puedes leer, buscar y EDITAR archivos dentro de esa ruta exacta.",
    '- La branch ya existe y ya está creada. NO ejecutes "git checkout", "git branch", "git commit", "git push", "git merge", "git reset", "git clean" ni ningún otro comando git — el control de versiones lo maneja el servidor, no tú.',
    "- NO hagas push. NO crees Pull Request. NO hagas merge. NO trabajes fuera de esta ruta ni toques otros proyectos.",
    "- NO leas ni modifiques archivos .env ni ningún secreto.",
    "- Haz exactamente el cambio de contenido pedido a continuación, nada más, y confírmalo brevemente al final.",
  ].join("\n");
}

// --- Orchestrator -----------------------------------------------------

export async function runEditTask(request: EditTaskRequest): Promise<ChatResponse> {
  const steps: ChatStep[] = [];

  const resolution = resolveProjectWorkspace(request.projectId);
  if (!resolution.ok) {
    steps.push({ label: "Proyecto validado", status: "error" });
    return { message: "El workspace del proyecto seleccionado no está disponible.", type: "development", status: "error", steps };
  }
  steps.push({ label: "Proyecto validado", status: "completed" });
  steps.push({ label: "Workspace validado", status: "completed" });

  const { workspacePath, projectId } = resolution.workspace;
  const projectName = projects.find((p) => p.id === projectId)?.name ?? projectId;

  const statusResult = await git.getStatusPorcelain(workspacePath);
  if (!statusResult.ok) {
    steps.push({ label: "Estado Git limpio", status: "error" });
    console.error("[task-runner] git status falló:", statusResult.stderr.slice(0, 300));
    return {
      message: "No se pudo comprobar el estado de Git del proyecto. Me detengo sin hacer ningún cambio.",
      type: "development",
      status: "error",
      steps,
    };
  }
  if (statusResult.stdout.trim().length > 0) {
    steps.push({ label: "Estado Git limpio", status: "error" });
    return {
      message:
        "El repositorio tiene cambios locales sin confirmar que SANAI no creó. Me detengo aquí: revisa o guarda esos cambios manualmente antes de pedirme una edición — no hago stash ni los sobrescribo.",
      type: "development",
      status: "error",
      steps,
    };
  }
  steps.push({ label: "Estado Git limpio", status: "completed" });

  const baseBranchResult = await git.getCurrentBranch(workspacePath);
  const baseBranch = baseBranchResult.ok ? baseBranchResult.stdout.trim() : "main";

  const taskId = newTaskId();
  const branch = await buildBranchName(workspacePath, request.message, taskId);
  const worktreeDir = getTaskWorktreePath(projectId, taskId);

  const worktreeResult = await git.createWorktree(workspacePath, worktreeDir, branch, baseBranch);
  if (!worktreeResult.ok) {
    steps.push({ label: `Branch ${branch}`, status: "error" });
    console.error("[task-runner] git worktree add falló:", worktreeResult.stderr.slice(0, 500));
    return { message: "No se pudo crear la branch/worktree aislada para esta tarea. No se hizo ningún cambio.", type: "development", status: "error", steps };
  }
  steps.push({ label: `Branch ${branch} creada`, status: "completed" });

  const sandboxOutcome = await pointDeveloperSandboxAt(worktreeDir);
  if (!sandboxOutcome.ok) {
    steps.push({ label: "Sandbox Developer preparado", status: "error" });
    console.error("[task-runner] no se pudo preparar el sandbox del Developer:", sandboxOutcome.detail);
    return {
      message: `${sandboxOutcome.detail} La branch "${branch}" quedó creada (sin cambios) por si quieres revisarla o eliminarla.`,
      type: "development",
      status: "error",
      steps,
    };
  }
  steps.push({ label: "Sandbox Developer preparado (solo este worktree)", status: "completed" });

  const editOutcome = await askOpenClaw(request.message, {
    contextHint: buildEditContext(projectName, branch),
    timeoutMs: EDIT_TIMEOUT_MS,
    agentId: DEVELOPER_AGENT_ID,
  });

  if (!editOutcome.ok) {
    steps.push({ label: "Modificando archivos", status: "error" });
    return {
      message: `No se pudo completar la edición: ${editOutcome.detail} La branch "${branch}" quedó creada (sin cambios) por si quieres revisarla o eliminarla.`,
      type: "development",
      status: "error",
      agent: "GitHub Copilot",
      steps,
    };
  }

  // Discard OpenClaw's own workspace-bootstrap files (AGENTS.md, SOUL.md,
  // ...) before computing "ground truth" — see stripOpenClawBootstrapArtifacts.
  const removedBootstrapFiles = await stripOpenClawBootstrapArtifacts(worktreeDir);
  if (removedBootstrapFiles.length > 0) {
    console.error(
      `[task-runner] ignorados artefactos de bootstrap de OpenClaw ajenos a la tarea: ${removedBootstrapFiles.join(", ")}`,
    );
  }

  // Ground truth, not the model's word: only real, on-disk changes count.
  const filesChanged = await git.getChangedFiles(worktreeDir);
  if (filesChanged.length === 0) {
    steps.push({ label: "Modificando archivos", status: "error" });
    return {
      message: `OpenClaw respondió, pero SANAI no detectó ningún cambio real en el workspace. Respuesta de OpenClaw: "${editOutcome.reply}". La branch "${branch}" quedó creada sin cambios.`,
      type: "development",
      status: "error",
      agent: "GitHub Copilot",
      steps,
    };
  }
  steps.push({ label: "Modificando archivos", status: "completed" });
  steps.push({
    label: `${filesChanged.length} archivo${filesChanged.length === 1 ? "" : "s"} modificado${filesChanged.length === 1 ? "" : "s"}`,
    status: "completed",
  });

  const validations: TaskValidations = {};

  const depsReady = await ensureDependencies(workspacePath, worktreeDir);
  steps.push({ label: depsReady ? "Dependencias listas" : "No se pudieron preparar las dependencias", status: depsReady ? "completed" : "error" });

  if (depsReady) {
    if (hasNpmScript(worktreeDir, "lint")) {
      const lint = await runCommand("npm", ["run", "lint"], worktreeDir, LINT_TIMEOUT_MS);
      validations.lint = lint.ok ? "passed" : "failed";
      steps.push({ label: lint.ok ? "Lint correcto" : "Lint con errores", status: lint.ok ? "completed" : "error" });
    } else {
      validations.lint = "skipped";
    }
    if (hasNpmScript(worktreeDir, "test")) {
      const test = await runCommand("npm", ["run", "test"], worktreeDir, TEST_TIMEOUT_MS);
      validations.test = test.ok ? "passed" : "failed";
      steps.push({ label: test.ok ? "Tests correctos" : "Tests con errores", status: test.ok ? "completed" : "error" });
    } else {
      validations.test = "skipped";
    }
    if (hasNpmScript(worktreeDir, "build")) {
      const build = await runCommand("npm", ["run", "build"], worktreeDir, BUILD_TIMEOUT_MS);
      validations.build = build.ok ? "passed" : "failed";
      steps.push({ label: build.ok ? "Build correcto" : "Build con errores", status: build.ok ? "completed" : "error" });
    } else {
      validations.build = "skipped";
    }
  }

  // Independent, read-only confirmation that nothing was pushed.
  const remoteCheck = await git.remoteBranchExists(workspacePath, branch);
  const pushedToRemote = remoteCheck.ok; // exit 0 => ref found on origin
  steps.push({ label: pushedToRemote ? "⚠ La branch aparece en origin (no debería)" : "Verificado: sin push al remoto", status: pushedToRemote ? "error" : "completed" });
  if (pushedToRemote) {
    console.error(`[task-runner] ALERTA: la branch "${branch}" aparece en origin pero SANAI nunca llamó a git push.`);
  }

  const diffStat = await git.getDiffStat(worktreeDir);
  const diff = await git.getDiff(worktreeDir);
  steps.push({ label: "Cambios listos para revisión", status: "completed" });

  const hadValidationError = steps.some((s) => s.status === "error");

  const storedTask: StoredTask = {
    taskId,
    projectId,
    projectName,
    baseBranch,
    taskBranch: branch,
    filesChanged,
    diffStat,
    diff,
    validations,
    status: "pending_review",
    createdAt: new Date().toISOString(),
    workspacePath,
    worktreeDir,
    instruction: request.message,
  };
  saveTask(storedTask);

  return {
    message: [
      editOutcome.reply,
      "",
      `Branch: ${branch} (worktree local en ${worktreeDir}, sin push, sin PR, sin merge). Pendiente de tu aprobación.`,
      diffStat ? `Resumen: ${diffStat}` : undefined,
    ]
      .filter((line): line is string => Boolean(line))
      .join("\n"),
    type: "development",
    status: hadValidationError ? "error" : "completed",
    agent: "GitHub Copilot",
    steps,
    task: toPublicTask(storedTask),
  };
}
