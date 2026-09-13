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
      <div className="flex h-16 items-center gap-3 px-5">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg brand-gradient">
          <svg viewBox="0 0 32 32" fill="none" className="h-5 w-5" aria-hidden>
            <polygon points="16,3 29,27 3,27" fill="none" stroke="white" strokeWidth="2.5" strokeLinejoin="round" />
            <line x1="16" y1="3" x2="9" y2="27" stroke="white" strokeWidth="2" opacity="0.7" />
            <line x1="8" y1="20" x2="24" y2="20" stroke="white" strokeWidth="2" opacity="0.7" />
          </svg>
        </div>
        <div className="flex flex-col leading-none">
          <span className="text-[15px] font-bold tracking-widest text-foreground">SANAI</span>
          <span className="text-[9px] font-medium tracking-wider text-muted-2 uppercase">SAN.AI</span>
        </div>
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
