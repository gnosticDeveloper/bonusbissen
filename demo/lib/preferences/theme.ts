import { setPreferenceCookie } from "./cookie";

// The inline script in `app/layout.tsx` reads this same cookie before hydration.
export type Theme = "light" | "dark" | "abismo";

export function persistTheme(theme: Theme) {
  setPreferenceCookie("theme", theme);
}

/**
 * Sets `data-theme` on <html> with CSS transitions suppressed, so the
 * view-transition snapshot shows final colors instead of mid-transition ones.
 */
export function applyThemeAttribute(theme: Theme) {
  const root = document.documentElement;
  root.classList.add("theme-switching");
  root.setAttribute("data-theme", theme);
  void window.getComputedStyle(root).backgroundColor;
  root.classList.remove("theme-switching");
}

// `data-theme` on <html> is set before hydration by the inline script, so it is the initial source of truth.
export function subscribeToThemeAttribute(onChange: () => void) {
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
  return () => observer.disconnect();
}

export function readThemeAttribute(): Theme {
  const current = document.documentElement.getAttribute("data-theme");
  if (current === "light" || current === "dark" || current === "abismo") return current;
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}
