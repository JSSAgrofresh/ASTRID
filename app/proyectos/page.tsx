import { ProjectCard } from "@/components/projects/ProjectCard";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { projects } from "@/lib/data";

export default function ProyectosPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-8 md:px-8">
      <SectionHeading
        title="Proyectos"
        description="Repositorios conectados y su estado de ejecución."
      />

      <div className="grid gap-4 sm:grid-cols-2">
        {projects.map((project) => (
          <ProjectCard key={project.id} project={project} detailed />
        ))}
      </div>
    </div>
  );
}
