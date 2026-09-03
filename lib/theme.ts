export type ThemePreference = "light" | "dark" | "system";
export type ResolvedTheme = "light" | "dark";

export const THEME_STORAGE_KEY = "astrid-theme";

export function resolveTheme(pref: ThemePreference): ResolvedTheme {
  if (pref === "system") {
    if (typeof window === "undefined") return "light";
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  }
  return pref;
}

export function applyResolvedTheme(resolved: ResolvedTheme) {
  const root = document.documentElement;
  root.setAttribute("data-theme", resolved);
  root.style.colorScheme = resolved;
}

/**
 * Serialized as a plain string and inlined as a blocking <script> in
 * app/layout.tsx's <head>, so the correct theme is set on <html> before
 * first paint — no flash of the wrong theme. Kept in sync with
 * `THEME_STORAGE_KEY` above by hand since it must be self-contained
 * (no imports run before hydration).
 */
export const THEME_BOOT_SCRIPT = `(function(){try{var k="astrid-theme";var v=localStorage.getItem(k)||"system";var r=v==="system"?(window.matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light"):v;var d=document.documentElement;d.setAttribute("data-theme",r);d.style.colorScheme=r;}catch(e){}})();`;
