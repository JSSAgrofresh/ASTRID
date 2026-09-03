import Link from "next/link";
import {
  ActivityIcon,
  PlusIcon,
  ProjectsIcon,
  PullRequestIcon,
  TasksIcon,
} from "@/components/icons";
import { StatCard } from "@/components/dashboard/StatCard";
import { ProjectCard } from "@/components/projects/ProjectCard";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { projects, summaryStats } from "@/lib/data";

export default function DashboardPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-8 md:px-8">
      <SectionHeading
        title="Inicio"
        description="Resumen general de tu operación con ASTRID."
      />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          label="Proyectos activos"
          value={String(summaryStats.activeProjects)}
          hint={`${projects.length} en total`}
          icon={<ProjectsIcon />}
          tone="gold"
        />
        <StatCard
          label="Tareas ejecutándose"
          value={String(summaryStats.runningTasks)}
          hint="En este momento"
          icon={<TasksIcon />}
        />
        <StatCard
          label="Pull Requests"
          value={String(summaryStats.pendingPullRequests)}
          hint="Pendientes de revisión"
          icon={<PullRequestIcon />}
        />
        <StatCard
          label="Salud del sistema"
          value={`${summaryStats.systemHealth}%`}
          hint="Últimas 24 horas"
          icon={<ActivityIcon />}
        />
      </div>

      <div className="mt-10">
        <SectionHeading
          title="Proyectos"
          description="Estado actual de tus repositorios conectados."
          action={
            <Link
              href="/proyectos"
              className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-muted transition-colors hover:border-border-strong hover:text-foreground"
            >
              <PlusIcon className="h-3.5 w-3.5" />
              Ver todos
            </Link>
          }
        />

        <div className="grid gap-4 sm:grid-cols-2">
          {projects.map((project) => (
            <ProjectCard key={project.id} project={project} />
          ))}
        </div>
      </div>
    </div>
  );
}
