/**
 * Server-only allowlist mapping ASTRID project ids to real filesystem
 * workspaces on this machine.
 *
 * Deliberately kept OUT of `lib/data.ts` — that module is imported by
 * client components (e.g. `components/chat/ChatShell.tsx`) to build the
 * project `<select>`, and anything it exports gets bundled for the
 * browser. `workspacePath` must never reach client-side code at all, not
 * just never be rendered — so it lives here instead, under `lib/server/`,
 * imported only by `lib/server/workspace.ts` and Route Handlers.
 *
 * This list IS the allowlist: `resolveProjectWorkspace` only ever accepts
 * a `projectId` (a short slug) from the client and looks it up here — a
 * client can never supply or influence a filesystem path directly.
 */
export interface ProjectWorkspace {
  projectId: string;
  workspacePath: string;
}

export const PROJECT_WORKSPACES: readonly ProjectWorkspace[] = [
  { projectId: "agrofresh", workspacePath: "/home/kokes/astrid/projects/agrofresh_report_hub" },
  { projectId: "astrid", workspacePath: "/home/kokes/astrid/projects/ASTRID" },
];
