"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { ArrowLeftRight, CircleHelp, House, RotateCcw, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useModal } from "@/components/modal";
import { resetDemo } from "@/lib/demo/store";
import { replayCurrentTour, resetTours, useHasTour } from "@/lib/tours";
import { cn } from "@/lib/helpers/utils";

/**
 * Demo-only helper (not in the main app): replays the page guide, jumps
 * between the customer app and the panel, and resets the sample data.
 */
export function DemoDock({ side, className }: { side: "customer" | "panel" | "auth"; className?: string }) {
  const router = useRouter();
  const { open: openModal, close } = useModal();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const reduceMotion = useReducedMotion();
  const hasTour = useHasTour();

  useEffect(() => {
    if (!open) return;
    const onPointer = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  function confirmReset() {
    setOpen(false);
    openModal(
      <div className="flex flex-col gap-4">
        <p className="text-sm leading-relaxed text-foreground/80">
          Se borran los cambios que hiciste (puntos, canjes, recompensas, imágenes) y vuelven a aparecer las guías de cada página.
        </p>
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button variant="outline" onClick={close}>
            Cancelar
          </Button>
          <Button
            onClick={() => {
              resetDemo();
              resetTours();
              close();
              router.push("/");
            }}
          >
            Reiniciar demo
          </Button>
        </div>
      </div>,
      { title: "¿Reiniciar la demo?", description: "Los datos de ejemplo vuelven a su estado inicial." },
    );
  }

  const switchTarget =
    side === "panel"
      ? { href: "/b", label: "Ver la app de clientes" }
      : { href: "/d/inicio", label: "Ir al panel del negocio" };

  const itemClass =
    "flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-sm text-foreground transition-colors hover:bg-foreground/10 focus-visible:bg-foreground/10 focus-visible:outline-none disabled:pointer-events-none disabled:opacity-45";

  return (
    <div ref={rootRef} className={cn("fixed right-4 z-40", className)}>
      <AnimatePresence>
        {open ? (
          <motion.div
            role="menu"
            aria-label="Opciones de la demo"
            initial={reduceMotion ? false : { opacity: 0, y: 8, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 6, scale: 0.97 }}
            transition={{ duration: reduceMotion ? 0 : 0.16, ease: [0.22, 1, 0.36, 1] }}
            className="absolute bottom-[calc(100%+0.5rem)] right-0 w-64 origin-bottom-right rounded-2xl border border-border bg-card p-1.5 shadow-xl"
          >
            <p className="px-3 pb-1.5 pt-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-foreground/60">Modo demo · datos de ejemplo</p>
            <button
              type="button"
              role="menuitem"
              disabled={!hasTour}
              className={itemClass}
              onClick={() => {
                setOpen(false);
                replayCurrentTour();
              }}
            >
              <CircleHelp className="size-4 shrink-0" aria-hidden="true" />
              Ver la guía de esta página
            </button>
            {side !== "auth" ? (
              <Link role="menuitem" href={switchTarget.href} className={itemClass} onClick={() => setOpen(false)}>
                <ArrowLeftRight className="size-4 shrink-0" aria-hidden="true" />
                {switchTarget.label}
              </Link>
            ) : null}
            <button type="button" role="menuitem" className={itemClass} onClick={confirmReset}>
              <RotateCcw className="size-4 shrink-0" aria-hidden="true" />
              Reiniciar la demo
            </button>
            <Link role="menuitem" href="/" className={itemClass} onClick={() => setOpen(false)}>
              <House className="size-4 shrink-0" aria-hidden="true" />
              Volver a la presentación
            </Link>
          </motion.div>
        ) : null}
      </AnimatePresence>

      <motion.button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
        whileTap={reduceMotion ? undefined : { scale: 0.94 }}
        className="flex h-10 items-center gap-1.5 rounded-full bg-foreground px-3.5 text-xs font-semibold text-background shadow-lg transition-opacity hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
      >
        <Sparkles className="size-4" aria-hidden="true" />
        Demo
      </motion.button>
    </div>
  );
}
