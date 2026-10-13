"use client";

import { Eclipse, Moon, Sun } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/helpers/utils";

type Theme = "light" | "dark" | "abismo";

const themes = [
  { value: "light", label: "Claro", Icon: Sun },
  { value: "dark", label: "Oscuro", Icon: Moon },
  { value: "abismo", label: "Abismo", Icon: Eclipse },
] as const;

function persistTheme(theme: Theme) {
  document.documentElement.setAttribute("data-theme", theme);
  document.cookie = `theme=${theme}; path=/; max-age=31536000; SameSite=Lax`;
}

function useTheme() {
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

export function ThemeToggle({ color }: { color?: string }) {
  const { theme, selectTheme } = useTheme();

  return (
    <div
      className="mx-4 rounded-2xl bg-background p-4"
      style={{ "--theme-toggle-accent": color || "var(--primary)" } as React.CSSProperties}
    >
      <p className="mb-3 text-sm font-medium text-foreground">Tema</p>
      <div role="group" aria-label="Elegir tema" className="grid grid-cols-3 gap-1 rounded-xl bg-card p-1">
        {themes.map(({ value, label, Icon }) => (
          <button
            key={value}
            type="button"
            aria-pressed={theme === value}
            onClick={() => selectTheme(value)}
            className={cn(
              "flex min-w-0 flex-col items-center gap-1 rounded-lg px-1 py-2 text-xs text-foreground transition-colors motion-reduce:transition-none focus-visible:outline-2 focus-visible:outline-(--theme-toggle-accent)",
              theme === value ? "bg-(--theme-toggle-accent) text-primary-foreground" : "hover:bg-foreground/10",
            )}
          >
            <Icon size={18} aria-hidden="true" />
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}

export function ThemeToggleButton({ className = "" }: { className?: string }) {
  const { theme, selectTheme } = useTheme();
  const [isOpen, setIsOpen] = useState(false);
  const switcherRef = useRef<HTMLDivElement>(null);
  const activeTheme = themes.find((option) => option.value === theme) ?? themes[0];

  useEffect(() => {
    if (!isOpen) return;

    const closeOnOutsideClick = (event: MouseEvent) => {
      if (!switcherRef.current?.contains(event.target as Node)) setIsOpen(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIsOpen(false);
    };

    document.addEventListener("mousedown", closeOnOutsideClick);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("mousedown", closeOnOutsideClick);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [isOpen]);

  return (
    <div ref={switcherRef} className={cn("relative shrink-0", className)}>
      <button
        type="button"
        onClick={() => setIsOpen((open) => !open)}
        aria-label={`Elegir tema. Actual: ${activeTheme.label}`}
        aria-expanded={isOpen}
        aria-haspopup="true"
        className="flex size-11 items-center justify-center rounded-xl bg-background text-foreground transition-colors hover:bg-border active:scale-95 motion-reduce:transition-none motion-reduce:active:scale-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
      >
        <activeTheme.Icon size={18} aria-hidden="true" />
      </button>
      {isOpen && (
        <div role="group" aria-label="Elegir tema" className="absolute right-0 top-[calc(100%+0.5rem)] z-30 min-w-36 rounded-xl border border-border bg-card p-1.5 shadow-lg">
          {themes.map(({ value, label, Icon }) => (
            <button
              key={value}
              type="button"
              aria-pressed={theme === value}
              onClick={() => {
                selectTheme(value);
                setIsOpen(false);
              }}
              className={cn(
                "flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-foreground hover:bg-foreground/10 focus-visible:bg-foreground/10 focus-visible:outline-none",
                theme === value && "bg-foreground/10 font-semibold",
              )}
            >
              <Icon size={18} aria-hidden="true" />
              {label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
