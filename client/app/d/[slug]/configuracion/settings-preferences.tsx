"use client";

import { useId, useState, type ReactNode } from "react";
import Link from "next/link";
import { motion, useReducedMotion } from "motion/react";
import { THEME_OPTIONS } from "@/components/theme-toggle";
import { cn } from "@/lib/helpers/utils";
import { persistGuidesEnabled } from "@/lib/preferences/guides";
import { useTheme } from "@/providers/theme-provider";

type SettingsPreferencesProps = {
  slug: string;
  defaultGuidesEnabled: boolean;
};

/** Per-device preferences of the dashboard. Each one applies as soon as it changes; there is nothing to save. */
export function SettingsPreferences({ slug, defaultGuidesEnabled }: SettingsPreferencesProps) {
  return (
    <div className="space-y-8">
      <SettingsSection title="Apariencia">
        <ThemeSetting />
      </SettingsSection>
      <SettingsSection title="Ayuda">
        <GuidesSetting slug={slug} defaultEnabled={defaultGuidesEnabled} />
      </SettingsSection>
    </div>
  );
}

function SettingsSection({ title, children }: { title: string; children: ReactNode }) {
  const headingId = useId();
  return (
    <section aria-labelledby={headingId}>
      <h2 id={headingId} className="mb-3 text-lg font-semibold tracking-tight">
        {title}
      </h2>
      <div className="divide-y divide-border rounded-3xl border border-border bg-card">{children}</div>
    </section>
  );
}

/** A preference: what it is on the left, its control on the right (below on narrow screens). */
function SettingRow({ labelId, title, description, children }: { labelId: string; title: string; description: ReactNode; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between sm:gap-8">
      <div className="min-w-0 max-w-md">
        <p id={labelId} className="font-semibold">
          {title}
        </p>
        <div className="mt-1 text-sm leading-6 text-foreground/80">{description}</div>
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}

function ThemeSetting() {
  const { theme, selectTheme } = useTheme();
  const labelId = useId();
  const name = useId();

  return (
    <SettingRow labelId={labelId} title="Tema" description="Elegí cómo se ve el panel. El cambio es inmediato.">
      {/* Native radios: arrow keys move between options and the group is a single tab stop. */}
      <div role="radiogroup" aria-labelledby={labelId} className="grid grid-cols-3 gap-1 rounded-2xl border border-border bg-background p-1 sm:w-80">
        {THEME_OPTIONS.map(({ value, label, Icon }) => (
          <label
            key={value}
            className={cn(
              "flex min-h-16 min-w-0 cursor-pointer flex-col items-center justify-center gap-1 rounded-xl border text-[13px] font-semibold transition-colors motion-reduce:transition-none has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-primary",
              theme === value ? "border-border bg-card text-foreground shadow-sm" : "border-transparent text-foreground/75 hover:bg-foreground/5 hover:text-foreground",
            )}
          >
            <input type="radio" name={name} value={value} checked={theme === value} onChange={() => selectTheme(value)} className="sr-only" />
            <Icon size={18} aria-hidden="true" />
            {label}
          </label>
        ))}
      </div>
    </SettingRow>
  );
}

function GuidesSetting({ slug, defaultEnabled }: { slug: string; defaultEnabled: boolean }) {
  const [enabled, setEnabled] = useState(defaultEnabled);
  const labelId = useId();
  const descriptionId = useId();

  function toggle() {
    const next = !enabled;
    persistGuidesEnabled(next);
    setEnabled(next);
  }

  return (
    <SettingRow
      labelId={labelId}
      title="Mostrar guías y consejos"
      description={
        <p id={descriptionId}>
          Son los recorridos que aparecen la primera vez que entrás a una pantalla y los consejos cortos que vienen después. Si los apagás, tampoco
          vas a ver los de funciones nuevas. Igual podés repasarlos cuando quieras desde{" "}
          <Link href={`/d/${slug}/ayuda`} className="font-semibold text-brand-ink underline decoration-primary decoration-2 underline-offset-[3px] hover:decoration-foreground">
            Ayuda
          </Link>
          .
        </p>
      }
    >
      <Switch checked={enabled} onToggle={toggle} labelledBy={labelId} describedBy={descriptionId} />
    </SettingRow>
  );
}

function Switch({ checked, onToggle, labelledBy, describedBy }: { checked: boolean; onToggle: () => void; labelledBy: string; describedBy: string }) {
  const reduceMotion = useReducedMotion();

  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-labelledby={labelledBy}
      aria-describedby={describedBy}
      onClick={onToggle}
      className={cn(
        "relative flex h-8 w-14 shrink-0 items-center rounded-full border p-0.75 transition-colors motion-reduce:transition-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary",
        checked ? "border-primary bg-primary" : "border-border bg-foreground/15",
      )}
    >
      <motion.span
        aria-hidden="true"
        className={cn("size-6 rounded-full shadow-sm", checked ? "bg-primary-foreground" : "bg-card")}
        initial={false}
        animate={{ x: checked ? 24 : 0 }}
        transition={reduceMotion ? { duration: 0 } : { type: "spring", visualDuration: 0.22, bounce: 0.25 }}
      />
    </button>
  );
}
