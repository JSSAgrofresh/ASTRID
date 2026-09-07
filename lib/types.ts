export type ProjectStatus = "activo" | "en-pausa" | "completado";

export interface Project {
  id: string;
  name: string;
  repo: string;
  branch: string;
  status: ProjectStatus;
  progress: number;
  pendingTasks: number;
  openPullRequests: number;
  lastCommit: string;
  lastActivity: string;
  description: string;
}

export type TaskStatus = "pendiente" | "en-ejecucion" | "completada" | "error";

export interface Task {
  id: string;
  title: string;
  projectId: string;
  status: TaskStatus;
  agent: string;
  updatedAt: string;
}

export type AgentStatus = "trabajando" | "activo" | "inactivo";

export interface Agent {
  id: string;
  name: string;
  role: string;
  status: AgentStatus;
  currentTask: string | null;
  model: string;
  lastActivity: string;
}

export type ActivityKind =
  | "commit"
  | "build"
  | "test"
  | "task"
  | "pull-request"
  | "agent";

export interface ActivityEvent {
  id: string;
  kind: ActivityKind;
  title: string;
  description: string;
  project: string;
  actor: string;
  timestamp: string;
}

/**
 * Chat wire contract — this shape is what `POST /api/chat` returns today
 * (backed by a local mock) and what it will keep returning once the route
 * proxies to the OpenClaw Gateway instead. The UI only ever depends on
 * this contract, never on how the response was produced.
 */
export type ChatMessageType = "conversation" | "development";

export type ChatOperationStatus = "analyzing" | "executing" | "completed" | "error";

export type ChatStepStatus = "pending" | "running" | "completed" | "error";

export interface ChatStep {
  label: string;
  status: ChatStepStatus;
}

export type GitTaskStatus =
  | "pending_review"
  | "approved"
  | "rejected"
  | "committed"
  | "pushed"
  | "pr_created"
  | "error";

export interface TaskValidations {
  lint?: "passed" | "failed" | "skipped";
  build?: "passed" | "failed" | "skipped";
  test?: "passed" | "failed" | "skipped";
}

/**
 * Client-safe view of a real, isolated Git edit task — only present when
 * ASTRID actually created a branch/worktree and (attempted to) change
 * files. `diff`/`diffStat`/`filesChanged` reflect real `git` output from
 * that worktree, never just what the model claimed to do. Deliberately
 * has NO filesystem path fields — those live only in
 * `lib/server/task-store.ts`'s server-only `StoredTask`.
 */
export interface PublicTask {
  taskId: string;
  projectId: string;
  projectName: string;
  baseBranch: string;
  taskBranch: string;
  filesChanged: string[];
  diffStat: string;
  diff: string;
  validations: TaskValidations;
  status: GitTaskStatus;
  createdAt: string;
  approvedAt?: string;
  commitSha?: string;
  pushedAt?: string;
  prUrl?: string;
  errorDetail?: string;
}

/**
 * A repo/project registered with ASTRID — client-safe. Deliberately has NO
 * filesystem path field; that lives only in
 * `lib/server/db/project-repository.ts`'s server-only `StoredProject`.
 */
export type ProjectVisibility = "public" | "private";
export type ProjectRegistryStatus = "registered";

export interface PublicProject {
  projectId: string;
  owner: string;
  repoName: string;
  fullName: string;
  displayName: string;
  defaultBranch: string;
  visibility: ProjectVisibility;
  status: ProjectRegistryStatus;
  createdAt: string;
  updatedAt: string;
}

/** Whether a GitHub repo the authenticated account can see is already known to ASTRID. */
export type LocalCloneStatus = "not_cloned" | "cloned" | "registered";

/** One repo from `GET /api/repositories` — GitHub metadata plus ASTRID's local status for it. */
export interface GithubRepoSummary {
  owner: string;
  repoName: string;
  fullName: string;
  visibility: ProjectVisibility;
  defaultBranch: string;
  cloneUrl: string;
  updatedAt: string;
  description: string;
  isPrivate: boolean;
  isArchived: boolean;
  isFork: boolean;
  localStatus: LocalCloneStatus;
  projectId?: string;
}

/** Body for `POST /api/projects/register`. */
export interface RegisterProjectRequest {
  fullName: string;
}

/** Body for `POST /api/repositories/create` — `confirm` must be explicitly `true`. */
export interface CreateRepositoryRequest {
  name: string;
  description?: string;
  visibility: ProjectVisibility;
  addReadme: boolean;
  gitignoreTemplate?: string;
  license?: string;
  confirm: boolean;
}

export interface ChatRequest {
  message: string;
  projectId?: string;
  mode?: string;
}

export interface ChatResponse {
  message: string;
  type: ChatMessageType;
  status?: ChatOperationStatus;
  agent?: string;
  steps?: ChatStep[];
  task?: PublicTask;
}

export type ChatRole = "user" | "astrid" | "system";

/**
 * A message as rendered in the chat history. For `role: "astrid"` it is
 * simply a `ChatResponse` plus the bookkeeping (`id`, `timestamp`) the UI
 * needs to display it.
 */
export interface ChatMessage {
  id: string;
  role: ChatRole;
  content: string;
  timestamp: string;
  type?: ChatMessageType;
  status?: ChatOperationStatus;
  agent?: string;
  steps?: ChatStep[];
  task?: PublicTask;
}

export type ConversationStatus = "active" | "archived";

/**
 * A persisted conversation — client-safe. Deliberately has no fields
 * beyond what's needed to list/identify it; the messages themselves are
 * fetched separately via `GET /api/conversations/[id]`.
 */
export interface PublicConversation {
  conversationId: string;
  projectId?: string;
  title: string;
  status: ConversationStatus;
  createdAt: string;
  updatedAt: string;
}

/** Body for `POST /api/conversations`. Both fields are optional — the "Nueva conversación" action sends neither. */
export interface CreateConversationRequest {
  projectId?: string;
  title?: string;
}

/**
 * Body for `POST /api/conversations/[id]/messages`. Mirrors `ChatMessage`
 * minus the bookkeeping (`id`, `timestamp`) the server assigns itself.
 */
export interface AppendMessageRequest {
  role: ChatRole;
  content: string;
  type?: ChatMessageType;
  status?: ChatOperationStatus;
  agent?: string;
  steps?: ChatStep[];
  task?: PublicTask;
}
