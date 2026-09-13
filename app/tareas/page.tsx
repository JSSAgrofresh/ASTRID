import { TaskBoard } from "@/components/tasks/TaskBoard";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { projects, tasks } from "@/lib/data";

export default function TareasPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-8 md:px-8">
      <SectionHeading
        title="Tareas"
        description="Seguimiento del trabajo orquestado por SANAI."
      />
      <TaskBoard tasks={tasks} projects={projects} />
    </div>
  );
}
