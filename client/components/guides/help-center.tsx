"use client";

import { useId, useMemo, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { ChevronDown, Play, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/toast";
import { cn } from "@/lib/helpers/utils";
import { GLOSSARY } from "@/lib/guides/glossary";
import { guideKey, parseSeen, resetSeen, seenSnapshot, subscribeSeen } from "@/lib/guides/storage";
import { useGuideReplay } from "@/lib/guides/store";
import { appliesToRole, renderGuideBody, type ViewGuide } from "@/lib/guides/types";
import { VIEW_GUIDES } from "@/lib/guides/views";
import type { UserRole } from "@/lib/types/user";
import { Term } from "./guide-term";

type Progress = "unseen" | "partial" | "seen";

const PROGRESS_LABEL: Record<Progress, string> = {
  unseen: "Sin ver",
  partial: "Tiene novedades",
  seen: "Vista",
};

const PROGRESS_CLASS: Record<Progress, string> = {
  unseen: "border border-border text-foreground/80",
  partial: "bg-primary text-primary-foreground",
  seen: "bg-foreground/8 text-foreground/75",
};

/** Help page body: every guide this role can open, readable here or replayed on its screen. */
export function HelpCenter({ slug, role, guidesEnabled }: { slug: string; role: UserRole; guidesEnabled: boolean }) {
  const router = useRouter();
  const notify = useToast();
  const requestReplay = useGuideReplay((state) => state.requestReplay);
  // `null` on the server and during hydration: progress depends on this device's cookies.
  const snapshot = useSyncExternalStore(subscribeSeen, seenSnapshot, () => null);
  const seenSteps = useMemo(() => (snapshot === null ? null : parseSeen(snapshot.split("|")[0])), [snapshot]);
  const [openId, setOpenId] = useState<string | null>(null);

  const guides = VIEW_GUIDES.filter((view) => view.roles.includes(role));

  function progressOf(view: ViewGuide): Progress | null {
    if (!seenSteps) return null;
    const steps = view.steps.filter((step) => appliesToRole(step, role));
    const seen = steps.filter((step) => seenSteps.has(guideKey(view.id, step.id))).length;
    return seen === 0 ? "unseen" : seen === steps.length ? "seen" : "partial";
  }

  function replay(view: ViewGuide) {
    requestReplay(view.id);
    router.push(`/d/${slug}${view.path}`);
  }

  function resetAll() {
    resetSeen();
    notify("Listo: las guías y los consejos van a volver a aparecer en cada pantalla.", "info");
  }

  return (
    <main className="mx-auto w-full max-w-3xl text-foreground">
      <header className="mb-8">
        <h1 className="text-3xl font-semibold tracking-tighter sm:text-4xl">Ayuda</h1>
        <p className="mt-2 max-w-xl text-sm leading-6 text-foreground/80">
          Repasá cómo funciona cada pantalla del panel. Podés leer la guía acá mismo o verla de nuevo sobre la pantalla.
        </p>
      </header>

      <section aria-labelledby="help-guides" className="mb-10">
        <h2 id="help-guides" className="mb-3 text-lg font-semibold tracking-tight">
          Guías por pantalla
        </h2>
        <ul className="divide-y divide-border overflow-hidden rounded-3xl border border-border bg-card">
          {guides.map((view) => (
            <GuideRow
              key={view.id}
              view={view}
              role={role}
              progress={progressOf(view)}
              open={openId === view.id}
              onToggle={() => setOpenId((current) => (current === view.id ? null : view.id))}
              onReplay={() => replay(view)}
            />
          ))}
        </ul>
      </section>

      <section aria-labelledby="help-glossary" className="mb-10">
        <h2 id="help-glossary" className="text-lg font-semibold tracking-tight">
          Palabras que usamos
        </h2>
        <p className="mt-1 text-sm text-foreground/80">
          En las guías, estas palabras aparecen subrayadas: tocalas para ver qué significan.
        </p>
        <dl className="mt-4 grid gap-x-8 gap-y-5 sm:grid-cols-2">
          {Object.entries(GLOSSARY).map(([id, entry]) => (
            <div key={id} className="border-l-2 border-primary pl-4">
              <dt className="text-sm font-semibold">{entry.label}</dt>
              <dd className="mt-1 space-y-1.5 text-sm leading-relaxed text-foreground/80">
                {entry.definition.map((paragraph) => (
                  <p key={paragraph}>{paragraph}</p>
                ))}
              </dd>
            </div>
          ))}
        </dl>
      </section>

      <section aria-labelledby="help-device" className="rounded-3xl border border-dashed border-border p-5 sm:p-6">
        <h2 id="help-device" className="text-base font-semibold">
          Las guías en este dispositivo
        </h2>
        <p className="mt-1.5 max-w-xl text-sm leading-relaxed text-foreground/80">
          Recordamos qué guías y consejos ya viste usando <Term id="cookies">cookies</Term> de este navegador. Si querés que vuelvan a aparecer todos, podés
          empezar de cero.
        </p>
        {guidesEnabled ? null : (
          <p className="mt-3 max-w-xl text-sm leading-relaxed text-foreground/80">
            Ahora están apagadas: solo aparecen cuando las pedís desde esta página. Podés volver a prenderlas en{" "}
            <Link
              href={`/d/${slug}/configuracion`}
              className="font-semibold text-brand-ink underline decoration-primary decoration-2 underline-offset-[3px] hover:decoration-foreground"
            >
              Configuración
            </Link>
            .
          </p>
        )}
        <Button variant="outline" className="mt-4" onClick={resetAll}>
          <RotateCcw data-icon="inline-start" />
          Volver a mostrar todas las guías
        </Button>
      </section>
    </main>
  );
}

type GuideRowProps = {
  view: ViewGuide;
  role: UserRole;
  progress: Progress | null;
  open: boolean;
  onToggle: () => void;
  onReplay: () => void;
};

function GuideRow({ view, role, progress, open, onToggle, onReplay }: GuideRowProps) {
  const reduceMotion = useReducedMotion();
  const panelId = useId();
  const Icon = view.icon;
  const steps = view.steps.filter((step) => appliesToRole(step, role));

  return (
    <li>
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        aria-controls={panelId}
        className="flex w-full items-center gap-4 px-4 py-4 text-left transition-colors hover:bg-foreground/5 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-primary sm:px-5"
      >
        <span className="grid size-10 shrink-0 place-items-center rounded-2xl bg-primary/12 text-foreground">
          <Icon className="size-5" aria-hidden="true" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex flex-wrap items-center gap-2">
            <span className="font-semibold">{view.title}</span>
            {progress ? (
              <span className={cn("rounded-full px-2 py-0.5 text-[11px] font-semibold", PROGRESS_CLASS[progress])}>{PROGRESS_LABEL[progress]}</span>
            ) : null}
          </span>
          <span className="mt-0.5 block text-sm text-foreground/75">{view.summary}</span>
        </span>
        <motion.span
          className="shrink-0 text-foreground/70"
          initial={false}
          animate={{ rotate: open ? 180 : 0 }}
          transition={reduceMotion ? { duration: 0 } : { type: "spring", visualDuration: 0.25, bounce: 0 }}
        >
          <ChevronDown className="size-5" aria-hidden="true" />
        </motion.span>
      </button>

      <AnimatePresence initial={false}>
        {open ? (
          <motion.div
            key="panel"
            id={panelId}
            initial={reduceMotion ? { opacity: 0 } : { height: 0, opacity: 0 }}
            animate={reduceMotion ? { opacity: 1 } : { height: "auto", opacity: 1 }}
            exit={reduceMotion ? { opacity: 0 } : { height: 0, opacity: 0 }}
            transition={reduceMotion ? { duration: 0 } : { type: "spring", visualDuration: 0.3, bounce: 0 }}
            style={{ overflow: "hidden" }}
          >
            <div className="px-4 pb-5 sm:px-5 sm:pl-19">
              <ol className="space-y-4">
                {steps.map((step, index) => (
                  <li key={step.id} className="flex gap-3">
                    <span
                      aria-hidden="true"
                      className="mt-0.5 grid size-6 shrink-0 place-items-center rounded-full bg-primary text-xs font-semibold text-primary-foreground"
                    >
                      {index + 1}
                    </span>
                    <div className="min-w-0">
                      <h3 className="text-sm font-semibold">{step.title}</h3>
                      <div className="mt-1 space-y-1.5 text-sm leading-relaxed text-foreground/80">{renderGuideBody(step.body, { role })}</div>
                    </div>
                  </li>
                ))}
              </ol>
              <Button className="mt-5 px-3.5" onClick={onReplay}>
                <Play data-icon="inline-start" />
                Ver la guía en la pantalla
              </Button>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </li>
  );
}
