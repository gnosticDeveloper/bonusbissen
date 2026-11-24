"use client";

import { createContext, useContext, useSyncExternalStore } from "react";
import { applyThemeAttribute, persistTheme, readThemeAttribute, subscribeToThemeAttribute, type Theme } from "@/lib/preferences/theme";

type ThemeContextValue = { theme: Theme; selectTheme: (theme: Theme) => void };

const ThemeContext = createContext<ThemeContextValue | null>(null);

const getServerTheme = (): Theme => "light";

type ViewTransitionDocument = Document & { startViewTransition?: (callback: () => void) => unknown };

/**
 * Theme switching with the same cross-fade as the main app: the `<html>`
 * attribute changes inside a view transition when the browser supports it.
 */
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const theme = useSyncExternalStore(subscribeToThemeAttribute, readThemeAttribute, getServerTheme);

  const selectTheme = (next: Theme) => {
    persistTheme(next);
    const doc = document as ViewTransitionDocument;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (doc.startViewTransition && !reduce) doc.startViewTransition(() => applyThemeAttribute(next));
    else applyThemeAttribute(next);
  };

  return <ThemeContext value={{ theme, selectTheme }}>{children}</ThemeContext>;
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) throw new Error("useTheme must be used within ThemeProvider");
  return context;
}
