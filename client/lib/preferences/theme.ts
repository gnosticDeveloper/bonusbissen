import { useSyncExternalStore } from "react";
import { setPreferenceCookie } from "./cookie";

// The inline script in `app/layout.tsx` reads this same cookie before hydration.
export type Theme = "light" | "dark" | "abismo";

function applyThemeAttribute(theme: Theme) {
  const root = document.documentElement;
  root.classList.add("theme-switching");
  root.setAttribute("data-theme", theme);
  void window.getComputedStyle(root).backgroundColor;
  root.classList.remove("theme-switching");
}

function persistTheme(theme: Theme) {
  setPreferenceCookie("theme", theme);

  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (reduceMotion || typeof document.startViewTransition !== "function") {
    applyThemeAttribute(theme);
    return;
  }

  document.startViewTransition(() => applyThemeAttribute(theme));
}

// `data-theme` on <html> is the source of truth, so every toggle on the page stays in sync.
function subscribe(onChange: () => void) {
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
  return () => observer.disconnect();
}

function readTheme(): Theme {
  const current = document.documentElement.getAttribute("data-theme");
  if (current === "light" || current === "dark" || current === "abismo") return current;
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export function useTheme() {
  const theme = useSyncExternalStore(subscribe, readTheme, () => "light" as const);
  return { theme, selectTheme: persistTheme };
}
