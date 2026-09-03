export interface NavItem {
  label: string;
  href: string;
  icon: "home" | "chat" | "projects" | "tasks" | "agents" | "activity" | "settings";
}

export const navItems: NavItem[] = [
  { label: "Inicio", href: "/", icon: "home" },
  { label: "Chat", href: "/chat", icon: "chat" },
  { label: "Proyectos", href: "/proyectos", icon: "projects" },
  { label: "Tareas", href: "/tareas", icon: "tasks" },
  { label: "Agentes", href: "/agentes", icon: "agents" },
  { label: "Actividad", href: "/actividad", icon: "activity" },
  { label: "Ajustes", href: "/ajustes", icon: "settings" },
];
