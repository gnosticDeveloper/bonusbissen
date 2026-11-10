import { useEffect, useState } from "react";
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

export function useTheme() {
  const [theme, setTheme] = useState<Theme>("light");

  useEffect(() => {
    const current = document.documentElement.getAttribute("data-theme");
    if (current === "light" || current === "dark" || current === "abismo") {
      setTheme(current);
    } else if (window.matchMedia("(prefers-color-scheme: dark)").matches) {
      setTheme("dark");
    }
  }, []);

  const selectTheme = (next: Theme) => {
    persistTheme(next);
    setTheme(next);
  };

  return { theme, selectTheme };
}
