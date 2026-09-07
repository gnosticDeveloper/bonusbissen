"use client";

import { create } from "zustand";

type Theme = "light" | "dark";

interface UIState {
  menuOpen: boolean;
  theme: Theme;
  openMenu: () => void;
  closeMenu: () => void;
  toggleMenu: () => void;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
  /** Lee la clase ya aplicada al <html> por el script anti-flash del RootLayout. Sin side effects. */
  syncThemeFromDOM: () => void;
}

export const useUIStore = create<UIState>((set, get) => ({
  menuOpen: false,
  theme: "dark", // valor inicial arbitrario, se corrige con syncThemeFromDOM al montar

  openMenu: () => set({ menuOpen: true }),
  closeMenu: () => set({ menuOpen: false }),
  toggleMenu: () => set((state) => ({ menuOpen: !state.menuOpen })),

  setTheme: (theme) => {
    set({ theme });
    if (typeof document !== "undefined") {
      document.documentElement.classList.toggle("dark", theme === "dark");
      window.localStorage.setItem("bb-theme", theme);
    }
  },

  toggleTheme: () => get().setTheme(get().theme === "dark" ? "light" : "dark"),

  syncThemeFromDOM: () => {
    if (typeof document === "undefined") return;
    const isDark = document.documentElement.classList.contains("dark");
    set({ theme: isDark ? "dark" : "light" });
  },
}));
