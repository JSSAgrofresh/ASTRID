"use client";

import { MonitorIcon, MoonIcon, SunIcon } from "@/components/icons";
import { useTheme } from "@/components/theme/ThemeProvider";
import type { ThemePreference } from "@/lib/theme";

const NEXT: Record<ThemePreference, ThemePreference> = {
  light: "dark",
  dark: "system",
  system: "light",
};

const ICON = { light: SunIcon, dark: MoonIcon, system: MonitorIcon };
const LABEL = { light: "Claro", dark: "Oscuro", system: "Sistema" };

/** Quick cycle button (Claro → Oscuro → Sistema → ...) for the Header. */
export function ThemeToggleButton() {
  const { theme, setTheme } = useTheme();
  const Icon = ICON[theme];

  return (
    <button
      type="button"
      onClick={() => setTheme(NEXT[theme])}
      className="flex h-9 w-9 items-center justify-center rounded-lg border border-border text-muted transition-colors hover:border-border-strong hover:text-foreground"
      aria-label={`Tema: ${LABEL[theme]}. Cambiar tema.`}
      title={`Tema: ${LABEL[theme]}`}
    >
      <Icon className="h-4 w-4" aria-hidden="true" />
    </button>
  );
}
