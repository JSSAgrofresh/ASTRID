import type {
  Agent,
  ActivityEvent,
  ChatMessage,
  Project,
  Task,
} from "./types";

export const projects: Project[] = [
  {
    id: "agrofresh",
    name: "AgroFresh Report Hub",
    repo: "JSSAgrofresh/agrofresh_report_hub",
    branch: "feature/filtro-laboratorio",
    status: "activo",
    progress: 68,
    pendingTasks: 3,
    openPullRequests: 1,
    lastCommit: "fix: normaliza unidades en resultados cromatográficos",
    lastActivity: "hace 12 minutos",
    description:
      "Plataforma de reportes de calidad y trazabilidad para laboratorios AgroFresh.",
  },
  {
    id: "astrid",
    name: "ASTRID",
    repo: "JSSAgrofresh/ASTRID",
    branch: "main",
    status: "en-pausa",
    progress: 34,
    pendingTasks: 5,
    openPullRequests: 0,
    lastCommit: "feat: primera versión visual del panel de control",
    lastActivity: "hace 1 hora",
    description:
      "Centro de operaciones personal para orquestar agentes de IA, proyectos y tareas.",
  },
];

export const tasks: Task[] = [
  {
    id: "task-1",
    title: "Revisar Resultados Cromatográficos",
    projectId: "agrofresh",
    status: "completada",
    agent: "Reviewer",
    updatedAt: "hace 25 minutos",
  },
  {
    id: "task-2",
    title: "Crear filtro por laboratorio",
    projectId: "agrofresh",
    status: "en-ejecucion",
    agent: "Developer",
    updatedAt: "hace 6 minutos",
  },
  {
    id: "task-3",
    title: "Ejecutar tests",
    projectId: "agrofresh",
    status: "pendiente",
    agent: "QA",
    updatedAt: "hace 6 minutos",
  },
  {
    id: "task-4",
    title: "Crear Pull Request",
    projectId: "agrofresh",
    status: "pendiente",
    agent: "DevOps",
    updatedAt: "hace 6 minutos",
  },
  {
    id: "task-5",
    title: "Diseñar sistema de tarjetas de proyecto",
    projectId: "astrid",
    status: "completada",
    agent: "Developer",
    updatedAt: "hace 1 hora",
  },
  {
    id: "task-6",
    title: "Definir arquitectura del panel de Agentes",
    projectId: "astrid",
    status: "en-ejecucion",
    agent: "Manager",
    updatedAt: "hace 40 minutos",
  },
  {
    id: "task-7",
    title: "Conectar feed de actividad con eventos reales",
    projectId: "astrid",
    status: "pendiente",
    agent: "DevOps",
    updatedAt: "hace 2 horas",
  },
  {
    id: "task-8",
    title: "Corregir validación del formulario de ajustes",
    projectId: "astrid",
    status: "error",
    agent: "QA",
    updatedAt: "hace 3 horas",
  },
];

export const agents: Agent[] = [
  {
    id: "manager",
    name: "Manager",
    role: "Orquestación y planificación",
    status: "activo",
    currentTask: "Definir arquitectura del panel de Agentes",
    model: "Automático",
    lastActivity: "hace 2 minutos",
  },
  {
    id: "developer",
    name: "Developer",
    role: "Implementación de código",
    status: "trabajando",
    currentTask: "Crear filtro por laboratorio",
    model: "GitHub Copilot",
    lastActivity: "hace 1 minuto",
  },
  {
    id: "reviewer",
    name: "Reviewer",
    role: "Revisión de cambios",
    status: "activo",
    currentTask: null,
    model: "Claude",
    lastActivity: "hace 25 minutos",
  },
  {
    id: "qa",
    name: "QA",
    role: "Pruebas y control de calidad",
    status: "inactivo",
    currentTask: null,
    model: "GitHub Copilot",
    lastActivity: "hace 3 horas",
  },
  {
    id: "devops",
    name: "DevOps",
    role: "Builds, despliegues y Pull Requests",
    status: "inactivo",
    currentTask: null,
    model: "Automático",
    lastActivity: "hace 6 minutos",
  },
];

export const activityEvents: ActivityEvent[] = [
  {
    id: "activity-1",
    kind: "task",
    title: "Nueva tarea en ejecución",
    description: "Crear filtro por laboratorio asignada al agente Developer.",
    project: "AgroFresh Report Hub",
    actor: "Manager",
    timestamp: "hace 6 minutos",
  },
  {
    id: "activity-2",
    kind: "commit",
    title: "Commit realizado",
    description: "fix: normaliza unidades en resultados cromatográficos",
    project: "AgroFresh Report Hub",
    actor: "Developer",
    timestamp: "hace 12 minutos",
  },
  {
    id: "activity-3",
    kind: "test",
    title: "Suite de tests ejecutada",
    description: "42 pruebas pasadas, 0 fallidas en el módulo de resultados.",
    project: "AgroFresh Report Hub",
    actor: "QA",
    timestamp: "hace 20 minutos",
  },
  {
    id: "activity-4",
    kind: "agent",
    title: "Agente asignado",
    description: "Copilot asignado a la tarea de filtros de laboratorio.",
    project: "AgroFresh Report Hub",
    actor: "Manager",
    timestamp: "hace 24 minutos",
  },
  {
    id: "activity-5",
    kind: "build",
    title: "Build completado",
    description: "next build finalizado sin errores en 48s.",
    project: "ASTRID",
    actor: "DevOps",
    timestamp: "hace 38 minutos",
  },
  {
    id: "activity-6",
    kind: "pull-request",
    title: "Pull Request abierto",
    description: "#128 Agrega filtro por laboratorio a Resultados Cromatográficos",
    project: "AgroFresh Report Hub",
    actor: "Developer",
    timestamp: "hace 45 minutos",
  },
  {
    id: "activity-7",
    kind: "task",
    title: "Tarea completada",
    description: "Diseñar sistema de tarjetas de proyecto finalizada.",
    project: "ASTRID",
    actor: "Developer",
    timestamp: "hace 1 hora",
  },
  {
    id: "activity-8",
    kind: "commit",
    title: "Commit realizado",
    description: "feat: primera versión visual del panel de control",
    project: "ASTRID",
    actor: "Developer",
    timestamp: "hace 1 hora",
  },
];

// Mirrors exactly what `generateMockChatResponse` would return for this
// message with projectId "agrofresh" and mode "automatico", so
// the seeded history never drifts from what the live API actually produces.
export const initialChatMessages: ChatMessage[] = [
  {
    id: "msg-1",
    role: "user",
    content:
      "Revisa el módulo de Resultados Cromatográficos y agrega un filtro por laboratorio.",
    timestamp: "09:14",
  },
  {
    id: "msg-2",
    role: "astrid",
    content: "Entendido. Revisaré la implementación actual antes de continuar.",
    timestamp: "09:14",
    type: "development",
    status: "analyzing",
    agent: "Manager",
    steps: [
      { label: "Proyecto identificado: AgroFresh Report Hub", status: "completed" },
      { label: "Solicitud clasificada como tarea de desarrollo", status: "completed" },
      { label: "Agente asignado: Manager", status: "completed" },
      { label: "Conexión con OpenClaw", status: "pending" },
    ],
  },
];

export const summaryStats = {
  activeProjects: projects.filter((p) => p.status === "activo").length,
  runningTasks: tasks.filter((t) => t.status === "en-ejecucion").length,
  pendingPullRequests: projects.reduce((acc, p) => acc + p.openPullRequests, 0),
  systemHealth: 98,
};
