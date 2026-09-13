import { BellIcon, PlusIcon } from "@/components/icons";
import { ThemeToggleButton } from "@/components/theme/ThemeToggleButton";

function getGreeting(hour: number) {
  if (hour < 6) return "Buenas noches";
  if (hour < 12) return "Buenos días";
  if (hour < 20) return "Buenas tardes";
  return "Buenas noches";
}

export function Header() {
  const hour = new Date().getHours();
  const greeting = getGreeting(hour);

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-border bg-background/80 px-4 backdrop-blur md:px-8">
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success opacity-60" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-success" />
          </span>
          <span className="hidden text-xs font-medium text-success sm:inline">
            Online
          </span>
        </div>
        <span className="hidden h-4 w-px bg-border sm:block" />
        <p className="text-sm text-muted">
          <span className="text-foreground">{greeting}, Jorge.</span>{" "}
          <span className="hidden sm:inline">SANAI está lista para orquestar tu trabajo.</span>
        </p>
      </div>

      <div className="flex items-center gap-2">
        <ThemeToggleButton />
        <button
          type="button"
          className="flex h-9 w-9 items-center justify-center rounded-lg border border-border text-muted transition-colors hover:border-border-strong hover:text-foreground"
          aria-label="Notificaciones"
        >
          <BellIcon />
        </button>
        <button
          type="button"
          className="flex h-9 items-center gap-1.5 rounded-lg border border-gold/30 bg-gold-dim px-3 text-sm font-medium text-gold-ink transition-colors hover:bg-gold-dim hover:border-gold/50"
        >
          <PlusIcon className="h-4 w-4" />
          <span className="hidden sm:inline">Nueva tarea</span>
        </button>
      </div>
    </header>
  );
}
