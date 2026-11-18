"use client";

import { Eclipse, Moon, Sun } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import { cn } from "@/lib/helpers/utils";
import type { Theme } from "@/lib/preferences/theme";
import { useTheme } from "@/providers/theme-provider";

const themes: { value: Theme; label: string; Icon: typeof Sun }[] = [
  { value: "light", label: "Claro", Icon: Sun },
  { value: "dark", label: "Oscuro", Icon: Moon },
  { value: "abismo", label: "Abismo", Icon: Eclipse },
];

/** Segmented theme picker. Native radios give it arrow-key navigation and a single tab stop. */
export function ThemeToggle({ className }: { className?: string }) {
  const { theme, selectTheme } = useTheme();
  const name = useId();

  return (
    <fieldset className={cn("min-w-0", className)}>
      <legend className="px-3 pb-2.5 text-xs font-bold uppercase tracking-[0.06em] text-foreground/75">Apariencia</legend>
      <div className="grid grid-cols-3 gap-1 rounded-2xl border border-border bg-background p-1">
        {themes.map(({ value, label, Icon }) => (
          <label
            key={value}
            className={cn(
              "flex min-h-16 min-w-0 cursor-pointer flex-col items-center justify-center gap-1 rounded-xl border text-[13px] font-semibold transition-colors motion-reduce:transition-none has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-foreground/70",
              theme === value ? "border-border bg-card text-foreground shadow-sm" : "border-transparent text-foreground/75 hover:bg-foreground/5 hover:text-foreground",
            )}
          >
            <input
              type="radio"
              name={name}
              value={value}
              checked={theme === value}
              onChange={() => selectTheme(value)}
              className="sr-only"
            />
            <Icon size={18} aria-hidden="true" />
            {label}
          </label>
        ))}
      </div>
    </fieldset>
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
        <div role="group" aria-label="Elegir tema" className="absolute right-0 bottom-[calc(100%+0.5rem)] z-30 min-w-36 rounded-xl border border-border bg-card p-1.5 shadow-lg">
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
