import type { ProjectVisibility, PublicProject } from "@/lib/types";
import { SqliteProjectRepository, type ProjectRepository, type StoredProject } from "./db/project-repository";
import { PROJECT_WORKSPACES } from "./project-workspaces";

export type { StoredProject };

/**
 * Server-side registry of projects ANAI knows about — backed by SQLite
 * (see `db/project-repository.ts`), replacing the old hardcoded
 * `PROJECT_WORKSPACES` allowlist as the primary source of truth.
 * `workspace.ts#resolveProjectWorkspace` reads from this registry now, so
 * registering a new repo (see `project-registry.ts`) makes it usable by
 * `task-runner.ts`/OpenClaw immediately, with no code change.
 *
 * Same pattern as `task-store.ts`: this module is the ONLY place that
 * constructs a `ProjectRepository`; everything else calls only the
 * functions below.
 */
const repo: ProjectRepository = new SqliteProjectRepository();

/**
 * One-time migration: seeds the registry with the two projects that used
 * to live only in the static `PROJECT_WORKSPACES` allowlist, keeping their
 * exact original `projectId` slugs ("astrid", "agrofresh") so existing
 * tasks/URLs/UI referencing those ids keep working unchanged. Idempotent —
 * an entry already present (by projectId) is left as-is, never
 * overwritten, so any local edits to a migrated project survive re-runs.
 * Real metadata (owner, defaultBranch, visibility) confirmed live against
 * `gh repo view` at the time this was written, not guessed.
 */
const LEGACY_PROJECT_SEEDS: ReadonlyArray<Omit<StoredProject, "status" | "createdAt" | "updatedAt">> = [
  {
    projectId: "astrid",
    owner: "JSSAgrofresh",
    repoName: "ANAI",
    fullName: "JSSAgrofresh/ASTRID",
    displayName: "ANAI",
    workspacePath: PROJECT_WORKSPACES.find((p) => p.projectId === "astrid")!.workspacePath,
    defaultBranch: "main",
    visibility: "public",
  },
  {
    projectId: "agrofresh",
    owner: "JSSAgrofresh",
    repoName: "agrofresh_report_hub",
    fullName: "JSSAgrofresh/agrofresh_report_hub",
    displayName: "AgroFresh Report Hub",
    workspacePath: PROJECT_WORKSPACES.find((p) => p.projectId === "agrofresh")!.workspacePath,
    defaultBranch: "main",
    visibility: "public",
  },
];

// Lazy, not run at module-evaluation time: Next.js's build/dev tooling
// imports this module (transitively, via workspace.ts) from several
// worker processes just to statically analyze route files, without ever
// calling any of the functions below. Touching the SQLite file as a
// module-load side effect made those workers race each other and hit a
// real "database is locked" error during `next build`. Deferring to first
// real call means the DB is only ever opened when a request actually
// needs it — exactly like `task-store.ts`.
let seeded = false;
function ensureLegacyProjectsSeeded(): void {
  if (seeded) return;
  seeded = true;
  const now = new Date().toISOString();
  for (const seed of LEGACY_PROJECT_SEEDS) {
    if (repo.get(seed.projectId)) continue;
    repo.save({ ...seed, status: "registered", createdAt: now, updatedAt: now });
  }
}

export function listProjects(): StoredProject[] {
  ensureLegacyProjectsSeeded();
  return repo.list();
}

export function getProject(projectId: string): StoredProject | undefined {
  ensureLegacyProjectsSeeded();
  return repo.get(projectId);
}

export function getProjectByFullName(fullName: string): StoredProject | undefined {
  ensureLegacyProjectsSeeded();
  return repo.getByFullName(fullName);
}

export function saveProject(project: StoredProject): StoredProject {
  ensureLegacyProjectsSeeded();
  return repo.save(project);
}

/** Explicit allowlist projection so `workspacePath` never leaves this function. */
export function toPublicProject(project: StoredProject): PublicProject {
  return {
    projectId: project.projectId,
    owner: project.owner,
    repoName: project.repoName,
    fullName: project.fullName,
    displayName: project.displayName,
    defaultBranch: project.defaultBranch,
    visibility: project.visibility,
    status: project.status,
    createdAt: project.createdAt,
    updatedAt: project.updatedAt,
  };
}

const SLUG_INVALID_CHARS = /[^a-z0-9]+/g;

/** Turns a GitHub repo name into a short, URL/id-safe `projectId`, disambiguated on collision. */
export function slugifyRepoName(repoName: string): string {
  ensureLegacyProjectsSeeded();
  const base = repoName.toLowerCase().replace(SLUG_INVALID_CHARS, "-").replace(/^-+|-+$/g, "") || "repo";
  if (!repo.get(base)) return base;
  let suffix = 2;
  while (repo.get(`${base}-${suffix}`)) suffix += 1;
  return `${base}-${suffix}`;
}

export type { ProjectVisibility };
