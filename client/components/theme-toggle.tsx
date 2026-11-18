"use client";

import { Eclipse, Moon, Sun } from "lucide-react";
import { useId } from "react";
import { cn } from "@/lib/helpers/utils";
import type { Theme } from "@/lib/preferences/theme";
import { useTheme } from "@/providers/theme-provider";

export const THEME_OPTIONS:{ value: Theme; label: string; Icon: typeof Sun }[] = [
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
        {THEME_OPTIONS.map(({ value, label, Icon }) => (
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
