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

export function MobileNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 flex items-stretch justify-between border-t border-border bg-background-elevated/95 px-1 backdrop-blur md:hidden">
      {navItems.map((item) => {
        const isActive =
          item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
        const Icon = iconMap[item.icon];

        return (
          <Link
            key={item.href}
            href={item.href}
            className={`flex flex-1 flex-col items-center gap-1 py-2.5 text-[10px] font-medium ${
              isActive ? "text-gold-ink" : "text-muted-2"
            }`}
          >
            <Icon className={isActive ? "text-gold-light" : "text-muted-2"} />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
