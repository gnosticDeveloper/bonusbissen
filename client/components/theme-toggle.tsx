"use client";

import { Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";

function persistTheme(theme: "light" | "dark") {
  document.documentElement.setAttribute("data-theme", theme);
  document.cookie = `theme=${theme}; path=/; max-age=31536000; SameSite=Lax`;
}

type Theme = "light" | "dark";

function useTheme() {
  const [theme, setTheme] = useState<Theme>("light");

  useEffect(() => {
    if (document.documentElement.getAttribute("data-theme") === "dark") {
      setTheme("dark");
    }
  }, []);

  const toggle = () => {
    const next: Theme = theme === "dark" ? "light" : "dark";
    persistTheme(next);
    setTheme(next);
  };

  return { theme, toggle };
}

/* Versión con texto + switch (la que ya tenías) */
export function ThemeToggle({ color }: { color?: string }) {
  const { theme, toggle } = useTheme();
  const isDark = theme === "dark";

  return (
    <div
      className="mx-4 mt-4 flex items-center justify-between rounded-2xl bg-background p-4"
      style={{ "--theme-toggle-accent": color || "var(--primary)" } as React.CSSProperties}
    >
      <div className="flex items-center gap-3">
        {isDark ? <Moon size={18} className="text-foreground" /> : <Sun size={18} className="text-foreground" />}
        <span className="text-sm font-medium text-foreground">Modo oscuro</span>
      </div>
      <button
        role="switch"
        aria-checked={isDark}
        aria-label="Cambiar tema"
        onClick={toggle}
        className={`relative h-6 w-11 shrink-0 rounded-full transition-colors motion-reduce:transition-none ${
          isDark ? "bg-(--theme-toggle-accent)" : "bg-muted/40"
        }`}
      >
        <span
          className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform motion-reduce:transition-none ${
            isDark ? "-translate-x-5.5" : "translate-x-0.5"
          }`}
        />
      </button>
    </div>
  );
}

/* Versión compacta: botón cuadrado solo con icono */
export function ThemeToggleButton({ className = "" }: { className?: string }) {
  const { theme, toggle } = useTheme();
  const isDark = theme === "dark";

  const icon = "absolute inset-0 transition-[opacity,transform] duration-200 motion-reduce:transition-none";

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={isDark ? "Cambiar a modo claro" : "Cambiar a modo oscuro"}
      className={`relative flex size-11 shrink-0 items-center justify-center rounded-xl bg-background text-foreground transition-colors hover:bg-border active:scale-95 motion-reduce:transition-none motion-reduce:active:scale-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${className}`}
    >
      <span className="relative size-4.5" aria-hidden="true">
        <Sun size={18} className={`${icon} ${isDark ? "scale-50 rotate-90 opacity-0" : "scale-100 rotate-0 opacity-100"}`} />
        <Moon size={18} className={`${icon} ${isDark ? "scale-100 rotate-0 opacity-100" : "scale-50 -rotate-90 opacity-0"}`} />
      </span>
    </button>
  );
}
