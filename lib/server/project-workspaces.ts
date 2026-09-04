/**
 * Historical seed data only — as of the GitHub Repository Manager module,
 * the live project registry lives in SQLite (`project-store.ts`,
 * `db/project-repository.ts`), not here. This list is read exactly once,
 * by `project-store.ts`'s one-time migration, to give the two projects
 * that predate the registry ("astrid", "agrofresh") their original
 * `workspacePath` without re-typing it. `workspace.ts#resolveProjectWorkspace`
 * no longer reads this file at all.
 *
 * Still deliberately kept OUT of `lib/data.ts` (client-bundled) for the
 * same reason as before: `workspacePath` must never reach client-side
 * code, not just never be rendered.
 */
export interface ProjectWorkspace {
  projectId: string;
  workspacePath: string;
}

export const PROJECT_WORKSPACES: readonly ProjectWorkspace[] = [
  { projectId: "agrofresh", workspacePath: "/home/kokes/astrid/projects/agrofresh_report_hub" },
  { projectId: "astrid", workspacePath: "/home/kokes/astrid/projects/ASTRID" },
];
