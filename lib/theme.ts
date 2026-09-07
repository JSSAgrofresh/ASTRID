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
 * A minimal external store over `localStorage`'s theme key, read via
 * `useSyncExternalStore` in `ThemeProvider`. This is the React-idiomatic
 * way to expose a value that differs between the server and the client
 * (localStorage isn't readable on the server) without a hydration
 * mismatch: React renders `getServerSnapshot()`'s value on both the
 * server and the client's first (hydration) pass, then re-renders with
 * the real client value immediately after — no manual `useEffect` +
 * `setState` needed, which is what `react-hooks/set-state-in-effect`
 * flags as an anti-pattern.
 *
 * `notifyThemeChange` covers same-tab updates (the native `storage`
 * event only fires in *other* tabs/windows); `setTheme` below calls it
 * right after writing to `localStorage`.
 */
const listeners = new Set<() => void>();

export function notifyThemeChange(): void {
  for (const listener of listeners) listener();
}

export function subscribeThemeChange(listener: () => void): () => void {
  listeners.add(listener);
  const onStorage = (event: StorageEvent) => {
    if (event.key === THEME_STORAGE_KEY) listener();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

export function getStoredThemeSnapshot(): ThemePreference {
  return (localStorage.getItem(THEME_STORAGE_KEY) as ThemePreference | null) ?? "system";
}

export function getServerThemeSnapshot(): ThemePreference {
  return "system";
}

/** Same idea as the theme store above, but for the resolved (light/dark) value — also reactive to `prefers-color-scheme` changes while `theme` is "system". */
export function subscribeResolvedThemeChange(listener: () => void): () => void {
  const unsubscribeTheme = subscribeThemeChange(listener);
  const mql = window.matchMedia("(prefers-color-scheme: dark)");
  mql.addEventListener("change", listener);
  return () => {
    unsubscribeTheme();
    mql.removeEventListener("change", listener);
  };
}

export function getResolvedThemeSnapshot(): ResolvedTheme {
  return resolveTheme(getStoredThemeSnapshot());
}

export function getServerResolvedThemeSnapshot(): ResolvedTheme {
  return "light";
}

/**
 * Serialized as a plain string and inlined as a blocking <script> in
 * app/layout.tsx's <head>, so the correct theme is set on <html> before
 * first paint — no flash of the wrong theme. Kept in sync with
 * `THEME_STORAGE_KEY` above by hand since it must be self-contained
 * (no imports run before hydration).
 */
export const THEME_BOOT_SCRIPT = `(function(){try{var k="astrid-theme";var v=localStorage.getItem(k)||"system";var r=v==="system"?(window.matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light"):v;var d=document.documentElement;d.setAttribute("data-theme",r);d.style.colorScheme=r;}catch(e){}})();`;
