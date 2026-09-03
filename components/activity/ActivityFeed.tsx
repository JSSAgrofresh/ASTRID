import {
  AgentsIcon,
  BuildIcon,
  CommitIcon,
  PullRequestIcon,
  TasksIcon,
  TestIcon,
} from "@/components/icons";
import { Card } from "@/components/ui/Card";
import type { ActivityEvent, ActivityKind } from "@/lib/types";

const kindIcon: Record<ActivityKind, typeof CommitIcon> = {
  commit: CommitIcon,
  build: BuildIcon,
  test: TestIcon,
  task: TasksIcon,
  "pull-request": PullRequestIcon,
  agent: AgentsIcon,
};

const kindLabel: Record<ActivityKind, string> = {
  commit: "Commit",
  build: "Build",
  test: "Tests",
  task: "Tarea",
  "pull-request": "Pull Request",
  agent: "Agente",
};

export function ActivityFeed({ events }: { events: ActivityEvent[] }) {
  return (
    <Card className="divide-y divide-border">
      {events.map((event) => {
        const Icon = kindIcon[event.kind];

        return (
          <div key={event.id} className="flex gap-4 p-4 sm:p-5">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-border bg-surface-2 text-muted">
              <Icon className="h-4 w-4" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
                <p className="text-sm font-medium text-foreground">{event.title}</p>
                <span className="text-[11px] text-muted-2">{event.timestamp}</span>
              </div>
              <p className="mt-0.5 truncate text-sm text-muted">{event.description}</p>
              <div className="mt-2 flex items-center gap-2 text-[11px] text-muted-2">
                <span className="rounded-full border border-border px-2 py-0.5">
                  {kindLabel[event.kind]}
                </span>
                <span>{event.project}</span>
                <span>·</span>
                <span>{event.actor}</span>
              </div>
            </div>
          </div>
        );
      })}
    </Card>
  );
}
