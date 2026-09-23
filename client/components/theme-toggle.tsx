"use client";

import { Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";

function persistTheme(theme: "light" | "dark") {
  document.documentElement.setAttribute("data-theme", theme);
  document.cookie = `theme=${theme}; path=/; max-age=31536000; SameSite=Lax`;
}

export function ThemeToggle() {
  const [theme, setTheme] = useState<"light" | "dark">("light");

  useEffect(() => {
    const current = document.documentElement.getAttribute("data-theme");
    if (current === "dark") setTheme("dark");
  }, []);

  const toggle = () => {
    const next = theme === "dark" ? "light" : "dark";
    persistTheme(next);
    setTheme(next);
  };

  return (
    <div className="mx-4 mt-4 flex items-center justify-between rounded-2xl bg-background p-4">
      <div className="flex items-center gap-3">
        {theme === "dark" ? <Moon size={18} className="text-foreground" /> : <Sun size={18} className="text-foreground" />}
        <span className="text-sm font-medium text-foreground">Modo oscuro</span>
      </div>
      <button
        role="switch"
        aria-checked={theme === "dark"}
        aria-label="Cambiar tema"
        onClick={toggle}
        className={`relative h-6 w-11 shrink-0 rounded-full transition-colors motion-reduce:transition-none ${
          theme === "dark" ? "bg-primary" : "bg-muted/40"
        }`}
      >
        <span
          className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform motion-reduce:transition-none ${
            theme === "dark" ? "-translate-x-5" : "translate-x-0.5"
          }`}
        />
      </button>
    </div>
  );
}
