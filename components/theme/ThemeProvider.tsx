"use client";

import { createContext, useCallback, useContext, useEffect, useSyncExternalStore, type ReactNode } from "react";
import {
  applyResolvedTheme,
  getResolvedThemeSnapshot,
  getServerResolvedThemeSnapshot,
  getServerThemeSnapshot,
  getStoredThemeSnapshot,
  notifyThemeChange,
  subscribeResolvedThemeChange,
  subscribeThemeChange,
  THEME_STORAGE_KEY,
  type ResolvedTheme,
  type ThemePreference,
} from "@/lib/theme";

interface ThemeContextValue {
  theme: ThemePreference;
  resolvedTheme: ResolvedTheme;
  setTheme: (theme: ThemePreference) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  // useSyncExternalStore renders `getServerSnapshot()`'s value on both the
  // server and the client's first (hydration) pass — matching what
  // THEME_BOOT_SCRIPT and <html data-theme="light"> already assume — then
  // re-renders with the real localStorage value right after. Any
  // component reading these (e.g. ThemeToggleButton's icon/aria-label)
  // therefore never disagrees with what the server rendered. See
  // lib/theme.ts for the store implementation.
  const theme = useSyncExternalStore(subscribeThemeChange, getStoredThemeSnapshot, getServerThemeSnapshot);
  const resolvedTheme = useSyncExternalStore(
    subscribeResolvedThemeChange,
    getResolvedThemeSnapshot,
    getServerResolvedThemeSnapshot,
  );

  // Applies the resolved theme to <html> whenever it changes — covers the
  // initial client sync, explicit theme switches, and prefers-color-scheme
  // changes while on "system". Also re-applies after React's Strict Mode
  // dev remount, which resets attributes THEME_BOOT_SCRIPT set outside JSX.
  useEffect(() => {
    applyResolvedTheme(resolvedTheme);
  }, [resolvedTheme]);

  const setTheme = useCallback((next: ThemePreference) => {
    localStorage.setItem(THEME_STORAGE_KEY, next);
    notifyThemeChange();
  }, []);

  return <ThemeContext.Provider value={{ theme, resolvedTheme, setTheme }}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme debe usarse dentro de <ThemeProvider>");
  return ctx;
}
