"use client";

import {
  ViewTransition,
  addTransitionType,
  createContext,
  startTransition,
  useContext,
  useLayoutEffect,
  useState,
  useSyncExternalStore,
} from "react";
import {
  THEME_TRANSITION_TYPE,
  applyThemeAttribute,
  persistTheme,
  readThemeAttribute,
  subscribeToThemeAttribute,
  type Theme,
} from "@/lib/preferences/theme";

type ThemeContextValue = { theme: Theme; selectTheme: (theme: Theme) => void };

const ThemeContext = createContext<ThemeContextValue | null>(null);

const getServerTheme = (): Theme => "light";

/**
 * Owns theme switching so React drives the view transition: the selection is a
 * transition-typed state update, and the <html> attribute is applied in a layout
 * effect, which React runs inside its `startViewTransition` update callback.
 * The boundary only animates on `theme-change`; navigations and other transitions
 * pass through untouched. Unsupported browsers just switch instantly.
 */
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const initialTheme = useSyncExternalStore(subscribeToThemeAttribute, readThemeAttribute, getServerTheme);
  const [selectedTheme, setSelectedTheme] = useState<Theme | null>(null);
  const theme = selectedTheme ?? initialTheme;

  useLayoutEffect(() => {
    if (selectedTheme) applyThemeAttribute(selectedTheme);
  }, [selectedTheme]);

  const selectTheme = (next: Theme) => {
    persistTheme(next);
    startTransition(() => {
      addTransitionType(THEME_TRANSITION_TYPE);
      setSelectedTheme(next);
    });
  };

  return (
    <ThemeContext value={{ theme, selectTheme }}>
      <ViewTransition default="none" update={{ [THEME_TRANSITION_TYPE]: "theme-change", default: "none" }}>
        {children}
      </ViewTransition>
    </ThemeContext>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) throw new Error("useTheme must be used within ThemeProvider");
  return context;
}
