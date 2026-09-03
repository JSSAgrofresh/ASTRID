import { agents, projects } from "@/lib/data";
import type { ChatRequest, ChatResponse, ChatStep } from "@/lib/types";

/**
 * Local stand-in for the OpenClaw Gateway.
 *
 * This module owns two things: (1) deciding whether a message is small talk
 * or a development request, and (2) shaping a `ChatResponse` for each case.
 * It is intentionally the ONLY place that logic lives — `app/api/chat/route.ts`
 * just calls `generateMockChatResponse`, so swapping this module for a real
 * call to OpenClaw later means changing one import, not touching the UI.
 *
 * Ground rule: nothing here may claim a real action happened (branch
 * updated, tests run, code changed, PR opened). It may only describe what
 * this mock itself actually did — reading the request and classifying it.
 */

const DEVELOPMENT_KEYWORDS = [
  "revisa",
  "revisar",
  "agrega",
  "agregar",
  "añade",
  "añadir",
  "implementa",
  "implementar",
  "corrige",
  "corregir",
  "arregla",
  "arreglar",
  "soluciona",
  "solucionar",
  "crea",
  "crear",
  "elimina",
  "eliminar",
  "borra",
  "borrar",
  "refactoriza",
  "refactorizar",
  "modifica",
  "modificar",
  "actualiza",
  "actualizar",
  "código",
  "codigo",
  "función",
  "funcion",
  "componente",
  "módulo",
  "modulo",
  "endpoint",
  "api",
  "base de datos",
  "bug",
  "prueba",
  "pruebas",
  "test",
  "tests",
  "pull request",
  "commit",
  "branch",
  "rama",
  "deploy",
  "despliegue",
  "filtro",
  "formulario",
  "pantalla",
  "vista",
];

const GREETING_PATTERN = /\b(hola|holi|buenas|buenos d[ií]as|buenas tardes|buenas noches|qu[eé] tal|hey)\b/i;
const THANKS_PATTERN = /\bgracias\b/i;

function isDevelopmentRequest(message: string): boolean {
  const normalized = message.toLowerCase();
  return DEVELOPMENT_KEYWORDS.some((keyword) => normalized.includes(keyword));
}

function buildConversationReply(message: string): string {
  if (GREETING_PATTERN.test(message)) {
    return "Hola, ¿en qué puedo ayudarte?";
  }
  if (THANKS_PATTERN.test(message)) {
    return "Con gusto. Aquí estaré si necesitas algo más.";
  }
  return "Entendido. Cuéntame más sobre lo que necesitas y te ayudo a orquestarlo.";
}

function resolveAgentName(mode: string | undefined): string {
  const explicit = agents.find((agent) => agent.id === mode);
  if (explicit) return explicit.name;
  // "automatico" (or no mode at all) triages through Manager until a real
  // orchestrator (OpenClaw) decides which agent should actually execute.
  return "Manager";
}

function resolveProjectName(projectId: string | undefined): string | undefined {
  return projects.find((project) => project.id === projectId)?.name;
}

function buildDevelopmentResponse(request: ChatRequest): ChatResponse {
  const projectName = resolveProjectName(request.projectId);
  const agentName = resolveAgentName(request.mode);

  const steps: ChatStep[] = [
    {
      label: projectName ? `Proyecto identificado: ${projectName}` : "Sin proyecto seleccionado",
      status: "completed",
    },
    { label: "Solicitud clasificada como tarea de desarrollo", status: "completed" },
    { label: `Agente asignado: ${agentName}`, status: "completed" },
    { label: "Conexión con OpenClaw", status: "pending" },
  ];

  return {
    message: "Entendido. Revisaré la implementación actual antes de continuar.",
    type: "development",
    status: "analyzing",
    agent: agentName,
    steps,
  };
}

export function generateMockChatResponse(request: ChatRequest): ChatResponse {
  const message = request.message.trim();

  if (!message) {
    return {
      message: "Escribe una instrucción para que pueda ayudarte.",
      type: "conversation",
    };
  }

  if (isDevelopmentRequest(message)) {
    return buildDevelopmentResponse(request);
  }

  return {
    message: buildConversationReply(message),
    type: "conversation",
  };
}
