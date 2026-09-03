import { Card } from "@/components/ui/Card";
import type { Task } from "@/lib/types";

export function TaskCard({ task, projectName }: { task: Task; projectName: string }) {
  return (
    <Card interactive className="p-3.5">
      <p className="text-sm font-medium leading-snug text-foreground">{task.title}</p>
      <p className="mt-1.5 text-xs text-muted">{projectName}</p>
      <div className="mt-3 flex items-center justify-between text-[11px] text-muted-2">
        <span className="rounded-full border border-border px-2 py-0.5">
          {task.agent}
        </span>
        <span>{task.updatedAt}</span>
      </div>
    </Card>
  );
}
