import { TaskCard } from "@/components/tasks/TaskCard";
import { taskStatusMeta } from "@/lib/status";
import type { Project, Task, TaskStatus } from "@/lib/types";

const columns: TaskStatus[] = ["pendiente", "en-ejecucion", "completada", "error"];

export function TaskBoard({ tasks, projects }: { tasks: Task[]; projects: Project[] }) {
  const projectName = (id: string) => projects.find((p) => p.id === id)?.name ?? id;

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {columns.map((status) => {
        const meta = taskStatusMeta[status];
        const columnTasks = tasks.filter((task) => task.status === status);

        return (
          <div key={status} className="flex flex-col gap-3">
            <div className="flex items-center justify-between px-1">
              <span className={`text-xs font-semibold tracking-wide ${
                status === "error"
                  ? "text-danger"
                  : status === "completada"
                    ? "text-success"
                    : status === "en-ejecucion"
                      ? "text-gold-ink"
                      : "text-muted"
              }`}>
                {meta.label.toUpperCase()}
              </span>
              <span className="rounded-full bg-surface-3 px-2 py-0.5 text-[11px] text-muted">
                {columnTasks.length}
              </span>
            </div>

            <div className="flex flex-col gap-2.5">
              {columnTasks.length === 0 ? (
                <p className="rounded-xl border border-dashed border-border px-3 py-6 text-center text-xs text-muted-2">
                  Sin tareas
                </p>
              ) : (
                columnTasks.map((task) => (
                  <TaskCard key={task.id} task={task} projectName={projectName(task.projectId)} />
                ))
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
