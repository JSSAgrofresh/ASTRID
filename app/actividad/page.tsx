import { ActivityFeed } from "@/components/activity/ActivityFeed";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { activityEvents } from "@/lib/data";

export default function ActividadPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-8 md:px-8">
      <SectionHeading
        title="Actividad"
        description="Feed de eventos generados por proyectos, tareas y agentes."
      />
      <ActivityFeed events={activityEvents} />
    </div>
  );
}
