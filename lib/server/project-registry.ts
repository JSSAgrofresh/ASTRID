import { existsSync } from "node:fs";
import type { CreateRepositoryRequest, GithubRepoSummary, LocalCloneStatus, PublicProject } from "@/lib/types";
import * as git from "./git-service";
import { cloneRepo, createRepo, listAuthenticatedRepos, viewRepo } from "./github-repos-service";
import {
  getProjectByFullName,
  listProjects,
  saveProject,
  slugifyRepoName,
  toPublicProject,
  type StoredProject,
} from "./project-store";
import { resolveNewProjectTargetPath, verifyProjectPathAfterClone } from "./workspace";

/**
 * Orchestrates GitHub repo discovery, registration, and creation for
 * ASTRID's project registry. This is the ONLY module that combines
 * `github-repos-service.ts` (gh CLI), `git-service.ts` (local repo
 * checks), `workspace.ts` (path safety), and `project-store.ts` (SQLite) —
 * API routes call only the three functions below, never those modules
 * directly.
 *
 * Security posture (matches the request this module implements):
 *   - listing/reading/searching repos, cloning a selected one, and
 *     registering it locally: allowed automatically, no extra gate here.
 *   - creating a brand-new GitHub repo: gated on an explicit `confirm:
 *     true` in the request body (see `createAndRegisterRepo`) — the UI
 *     must show the user a concrete summary and get a real second click
 *     before ever sending that flag; a freeform chat message can never
 *     reach this function at all (it is not wired into
 *     `task-runner.ts`/OpenClaw in any way).
 *   - deleting, transferring, changing ownership, changing visibility,
 *     archiving, force-push, auto-merge, secrets, collaborators, branch
 *     protection: none of that is implemented here at all.
 */

export type RegistryOutcome = { ok: true; project: PublicProject } | { ok: false; detail: string };

const FULL_NAME_PATTERN = /^[A-Za-z0-9](?:[A-Za-z0-9-]{0,38})\/[A-Za-z0-9._-]{1,100}$/;
const REPO_NAME_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._-]{0,99}$/;

function extractFullNameFromRemoteUrl(url: string): string | null {
  const https = url.match(/^https:\/\/github\.com\/([^/]+)\/([^/]+?)(?:\.git)?\/?$/i);
  if (https) return `${https[1]}/${https[2]}`;
  const ssh = url.match(/^git@github\.com:([^/]+)\/([^/]+?)(?:\.git)?$/i);
  if (ssh) return `${ssh[1]}/${ssh[2]}`;
  return null;
}

export async function listReposWithLocalStatus(): Promise<
  { ok: true; repos: GithubRepoSummary[] } | { ok: false; detail: string }
> {
  const listResult = await listAuthenticatedRepos(100);
  if (!listResult.ok) return { ok: false, detail: listResult.detail };

  const registeredByFullName = new Map(listProjects().map((p) => [p.fullName.toLowerCase(), p]));

  const repos: GithubRepoSummary[] = listResult.repos.map((repo) => {
    const match = registeredByFullName.get(repo.nameWithOwner.toLowerCase());
    let localStatus: LocalCloneStatus = "not_cloned";
    if (match) {
      localStatus = "registered";
    } else {
      const target = resolveNewProjectTargetPath(repo.name);
      if (target.ok && existsSync(target.path)) localStatus = "cloned";
    }

    return {
      owner: repo.owner.login,
      repoName: repo.name,
      fullName: repo.nameWithOwner,
      visibility: repo.isPrivate ? "private" : "public",
      defaultBranch: repo.defaultBranchRef?.name ?? "main",
      cloneUrl: repo.url,
      updatedAt: repo.updatedAt,
      description: repo.description,
      isPrivate: repo.isPrivate,
      isArchived: repo.isArchived,
      isFork: repo.isFork,
      localStatus,
      projectId: match?.projectId,
    };
  });

  return { ok: true, repos };
}

/**
 * Registers an existing GitHub repo (already accessible to the
 * authenticated `gh` account) as an ASTRID project: clones it if not
 * present locally, or validates an existing local copy's `origin` remote
 * matches before trusting it. No approval gate — this is the
 * "clonar/registrar" action, explicitly allowed automatically.
 */
export async function registerExistingRepo(rawFullName: string): Promise<RegistryOutcome> {
  const fullName = rawFullName.trim();
  if (!FULL_NAME_PATTERN.test(fullName)) {
    return { ok: false, detail: `"${fullName}" no tiene el formato owner/repo esperado.` };
  }

  const already = getProjectByFullName(fullName);
  if (already) return { ok: true, project: toPublicProject(already) };

  // The real access-control check: `gh repo view` only succeeds for repos
  // the authenticated account can actually see.
  const view = await viewRepo(fullName);
  if (!view.ok) {
    return { ok: false, detail: `No se pudo verificar el repositorio en GitHub: ${view.detail}` };
  }
  const repo = view.repo;
  const confirmedFullName = repo.nameWithOwner;

  const target = resolveNewProjectTargetPath(repo.name);
  if (!target.ok) return { ok: false, detail: target.detail };

  if (existsSync(target.path)) {
    const remote = await git.getRemoteUrl(target.path);
    if (!remote.ok) {
      return {
        ok: false,
        detail: `Ya existe una carpeta en ${target.path}, pero no es un repositorio Git válido (sin remote "origin").`,
      };
    }
    const remoteFullName = extractFullNameFromRemoteUrl(remote.stdout.trim());
    if (!remoteFullName || remoteFullName.toLowerCase() !== confirmedFullName.toLowerCase()) {
      return {
        ok: false,
        detail: `Ya existe una carpeta en ${target.path}, pero su remote "origin" no coincide con ${confirmedFullName}.`,
      };
    }
  } else {
    const clone = await cloneRepo(confirmedFullName, target.path);
    if (!clone.ok) return { ok: false, detail: clone.detail };
  }

  const projectId = slugifyRepoName(repo.name);
  const verify = verifyProjectPathAfterClone(projectId, target.path);
  if (!verify.ok) return { ok: false, detail: verify.detail };

  const now = new Date().toISOString();
  const stored: StoredProject = {
    projectId,
    owner: repo.owner.login,
    repoName: repo.name,
    fullName: confirmedFullName,
    displayName: repo.name,
    workspacePath: verify.workspace.workspacePath,
    defaultBranch: repo.defaultBranchRef?.name ?? "main",
    visibility: repo.isPrivate ? "private" : "public",
    status: "registered",
    createdAt: now,
    updatedAt: now,
  };
  saveProject(stored);
  return { ok: true, project: toPublicProject(stored) };
}

/**
 * Creates a brand-new GitHub repo and registers it. HARD requirement:
 * `params.confirm` must be `true` — this is the "acción estructurada"
 * approval gate for repo creation. The UI must show the user the exact
 * name/visibility/options and get a distinct confirming click before ever
 * setting this flag; there is no way to reach this function from a
 * freeform chat message.
 */
export async function createAndRegisterRepo(params: CreateRepositoryRequest): Promise<RegistryOutcome> {
  if (params.confirm !== true) {
    return { ok: false, detail: "Falta confirmación explícita para crear un repositorio nuevo." };
  }
  if (!REPO_NAME_PATTERN.test(params.name)) {
    return { ok: false, detail: `Nombre de repositorio no válido: "${params.name}".` };
  }

  const target = resolveNewProjectTargetPath(params.name);
  if (!target.ok) return { ok: false, detail: target.detail };
  if (existsSync(target.path)) {
    return {
      ok: false,
      detail: `Ya existe una carpeta local en ${target.path}. ASTRID no creará el repositorio para evitar un conflicto.`,
    };
  }

  const created = await createRepo({
    name: params.name,
    description: params.description,
    visibility: params.visibility,
    addReadme: params.addReadme,
    gitignoreTemplate: params.gitignoreTemplate,
    license: params.license,
  });
  if (!created.ok) return { ok: false, detail: created.detail };

  const clone = await cloneRepo(created.fullName, target.path);
  if (!clone.ok) {
    return {
      ok: false,
      detail: `El repositorio se creó en GitHub (${created.fullName}) pero no se pudo clonar localmente: ${clone.detail}`,
    };
  }

  const projectId = slugifyRepoName(params.name);
  const verify = verifyProjectPathAfterClone(projectId, target.path);
  if (!verify.ok) return { ok: false, detail: verify.detail };

  const view = await viewRepo(created.fullName);
  const defaultBranch = view.ok ? view.repo.defaultBranchRef?.name ?? "main" : "main";
  const owner = created.fullName.split("/")[0];

  const now = new Date().toISOString();
  const stored: StoredProject = {
    projectId,
    owner,
    repoName: params.name,
    fullName: created.fullName,
    displayName: params.name,
    workspacePath: verify.workspace.workspacePath,
    defaultBranch,
    visibility: params.visibility,
    status: "registered",
    createdAt: now,
    updatedAt: now,
  };
  saveProject(stored);
  return { ok: true, project: toPublicProject(stored) };
}
