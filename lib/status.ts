import type { StatusTone } from "@/components/ui/StatusBadge";
import type {
  AgentStatus,
  ChatOperationStatus,
  ChatStepStatus,
  ProjectStatus,
  TaskStatus,
} from "./types";

interface StatusMeta {
  label: string;
  tone: StatusTone;
  pulse?: boolean;
}

export const projectStatusMeta: Record<ProjectStatus, StatusMeta> = {
  activo: { label: "Activo", tone: "success", pulse: true },
  "en-pausa": { label: "En pausa", tone: "warning" },
  completado: { label: "Completado", tone: "gold" },
};

export const taskStatusMeta: Record<TaskStatus, StatusMeta> = {
  pendiente: { label: "Pendiente", tone: "muted" },
  "en-ejecucion": { label: "En ejecución", tone: "gold", pulse: true },
  completada: { label: "Completada", tone: "success" },
  error: { label: "Error", tone: "danger" },
};

export const agentStatusMeta: Record<AgentStatus, StatusMeta> = {
  trabajando: { label: "Trabajando", tone: "gold", pulse: true },
  activo: { label: "Activo", tone: "success" },
  inactivo: { label: "Inactivo", tone: "muted" },
};

export const chatOperationStatusMeta: Record<ChatOperationStatus, StatusMeta> = {
  analyzing: { label: "Analizando", tone: "warning", pulse: true },
  executing: { label: "Ejecutando", tone: "gold", pulse: true },
  completed: { label: "Completado", tone: "success" },
  error: { label: "Error", tone: "danger" },
};

export const chatStepStatusMeta: Record<ChatStepStatus, StatusMeta> = {
  pending: { label: "Pendiente", tone: "muted" },
  running: { label: "En curso", tone: "gold", pulse: true },
  completed: { label: "Completado", tone: "success" },
  error: { label: "Error", tone: "danger" },
};
