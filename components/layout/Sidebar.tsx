"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ActivityIcon,
  AgentsIcon,
  ChatIcon,
  HomeIcon,
  ProjectsIcon,
  SettingsIcon,
  TasksIcon,
} from "@/components/icons";
import { navItems } from "@/lib/nav";

const iconMap = {
  home: HomeIcon,
  chat: ChatIcon,
  projects: ProjectsIcon,
  tasks: TasksIcon,
  agents: AgentsIcon,
  activity: ActivityIcon,
  settings: SettingsIcon,
};

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden w-60 shrink-0 flex-col border-r border-border bg-background-elevated md:flex">
      <div className="flex h-16 items-center gap-2.5 px-6">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-gold/30 bg-gold-dim">
          <span className="text-sm font-semibold text-gold-ink">A</span>
        </div>
        <span className="text-[15px] font-semibold tracking-wide text-foreground">
          ASTRID
        </span>
      </div>

      <nav className="flex-1 space-y-1 px-3 py-4">
        {navItems.map((item) => {
          const isActive =
            item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
          const Icon = iconMap[item.icon];

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors ${
                isActive
                  ? "bg-gold-dim text-gold-ink"
                  : "text-muted hover:bg-surface-2 hover:text-foreground"
              }`}
            >
              {isActive && (
                <span className="absolute left-0 top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-full bg-gold" />
              )}
              <Icon
                className={isActive ? "text-gold-light" : "text-muted-2 group-hover:text-foreground"}
              />
              <span className="font-medium">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-border px-6 py-4">
        <p className="text-[11px] uppercase tracking-wider text-muted-2">
          Orquestador
        </p>
        <p className="mt-1 text-xs text-muted">OpenClaw · Claude · Copilot</p>
      </div>
    </aside>
  );
}
