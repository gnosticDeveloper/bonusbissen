"use client";

import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState, useSyncExternalStore, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { ArrowLeft, ArrowRight, Sparkles, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/helpers/utils";
import { hasSeenTour, markTourSeen, registerTourReplay } from "@/lib/tours";

/**
 * Demo-only coach marks. A step points at an element marked with
 * `data-tour="<name>"`; steps whose target is not on screen when the tour starts
 * are skipped, and steps without `target` show as a centered card. Shown once per page (cookie).
 */
export type TourStep = {
  target?: string;
  title: string;
  body: ReactNode;
};

type Rect = { top: number; left: number; width: number; height: number };

const PADDING = 8;
const GAP = 14;
const EDGE = 12;
const CARD_WIDTH = 340;
const subscribeToNothing = () => () => {};

function findTarget(name: string | undefined): HTMLElement | null {
  if (!name) return null;
  const candidates = document.querySelectorAll<HTMLElement>(`[data-tour="${name}"]`);
  for (const element of candidates) {
    const rect = element.getBoundingClientRect();
    // Skip hidden elements and those parked off-screen (e.g. inside the closed mobile drawer).
    const onScreenHorizontally = rect.right > 0 && rect.left < window.innerWidth;
    if (rect.width > 0 && rect.height > 0 && onScreenHorizontally && element.getClientRects().length > 0) return element;
  }
  return null;
}

function measure(element: HTMLElement): Rect {
  const rect = element.getBoundingClientRect();
  return { top: rect.top - PADDING, left: rect.left - PADDING, width: rect.width + PADDING * 2, height: rect.height + PADDING * 2 };
}

export function PageTour({ id, steps, ready = true, delay = 500 }: { id: string; steps: TourStep[]; ready?: boolean; delay?: number }) {
  const [open, setOpen] = useState(false);
  const [index, setIndex] = useState(0);
  const [rect, setRect] = useState<Rect | null>(null);
  const [cardHeight, setCardHeight] = useState(220);
  const [viewport, setViewport] = useState({ width: 1024, height: 768 });
  const cardRef = useRef<HTMLDivElement>(null);
  const targetRef = useRef<HTMLElement | null>(null);
  const reduceMotion = useReducedMotion();
  const hydrated = useSyncExternalStore(subscribeToNothing, () => true, () => false);
  const titleId = useId();
  const bodyId = useId();

  // The steps are frozen when the tour starts, dropping those whose target is not on screen.
  const [active, setActive] = useState<TourStep[]>([]);
  const stepsRef = useRef(steps);
  useEffect(() => {
    stepsRef.current = steps;
  });

  const start = useCallback(() => {
    const available = stepsRef.current.filter((candidate) => !candidate.target || findTarget(candidate.target));
    if (available.length === 0) return;
    setActive(available);
    setIndex(0);
    setOpen(true);
    markTourSeen(id);
  }, [id]);

  // First visit: start once the page has its data on screen.
  useEffect(() => {
    if (!ready || hasSeenTour(id)) return;
    const timer = window.setTimeout(start, delay);
    return () => window.clearTimeout(timer);
  }, [ready, id, delay, start]);

  useEffect(() => (ready ? registerTourReplay(start) : undefined), [ready, start]);

  const step = active[index];
  const close = useCallback(() => setOpen(false), []);

  // Locate the target of the current step, scroll it into view and follow it.
  useLayoutEffect(() => {
    if (!open || !step) return;
    const element = findTarget(step.target);
    targetRef.current = element;
    setViewport({ width: window.innerWidth, height: window.innerHeight });

    if (!element) {
      setRect(null);
      return;
    }

    const inView = (() => {
      const r = element.getBoundingClientRect();
      return r.top >= 80 && r.bottom <= window.innerHeight - 80;
    })();
    if (!inView) element.scrollIntoView({ block: "center", behavior: reduceMotion ? "auto" : "smooth" });

    let frame = 0;
    const update = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        if (!targetRef.current) return;
        setRect(measure(targetRef.current));
        setViewport({ width: window.innerWidth, height: window.innerHeight });
      });
    };
    update();
    const observer = new ResizeObserver(update);
    observer.observe(element);
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, true);
    // Smooth scrolling moves the target for a while; keep measuring until it settles.
    const settle = window.setInterval(update, 120);
    const stopSettle = window.setTimeout(() => window.clearInterval(settle), 900);
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update, true);
      window.clearInterval(settle);
      window.clearTimeout(stopSettle);
    };
  }, [open, step, reduceMotion]);

  useLayoutEffect(() => {
    if (open && cardRef.current) setCardHeight(cardRef.current.offsetHeight);
  }, [open, index, rect]);

  useEffect(() => {
    if (!open) return;
    cardRef.current?.focus({ preventScroll: true });
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") close();
      if (event.key === "ArrowRight") setIndex((i) => Math.min(i + 1, active.length - 1));
      if (event.key === "ArrowLeft") setIndex((i) => Math.max(i - 1, 0));
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, close, active.length]);

  if (!hydrated) return null;

  const isLast = index === active.length - 1;
  const mobile = viewport.width < 640;
  const width = Math.min(CARD_WIDTH, viewport.width - EDGE * 2);

  // Card placement: below the target when it fits, otherwise above; centered without a target.
  let cardStyle: { top: number; left: number };
  if (!rect) {
    cardStyle = { top: Math.max(EDGE, (viewport.height - cardHeight) / 2), left: (viewport.width - width) / 2 };
  } else if (mobile) {
    const targetCenter = rect.top + rect.height / 2;
    cardStyle = { top: targetCenter < viewport.height / 2 ? viewport.height - cardHeight - EDGE - 8 : EDGE + 8, left: EDGE };
  } else {
    const below = rect.top + rect.height + GAP;
    const above = rect.top - GAP - cardHeight;
    const fitsBelow = below + cardHeight <= viewport.height - EDGE;
    const fitsAbove = above >= EDGE;
    let top = fitsBelow ? below : fitsAbove ? above : NaN;
    let left = rect.left + rect.width / 2 - width / 2;
    if (Number.isNaN(top)) {
      // Tall targets: beside them, vertically centered.
      top = Math.min(Math.max(EDGE, rect.top + rect.height / 2 - cardHeight / 2), viewport.height - cardHeight - EDGE);
      const right = rect.left + rect.width + GAP;
      left = right + width <= viewport.width - EDGE ? right : rect.left - GAP - width;
    }
    cardStyle = { top, left: Math.max(EDGE, Math.min(left, viewport.width - width - EDGE)) };
  }

  const spring = reduceMotion ? { duration: 0 } : ({ type: "spring", stiffness: 380, damping: 36 } as const);

  return createPortal(
    <AnimatePresence>
      {open && step ? (
        <motion.div
          key="tour"
          className="fixed inset-0 z-70"
          initial={reduceMotion ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: reduceMotion ? 0 : 0.2 }}
        >
          {/* Blocks the page while the guide is open; the spotlight is purely visual. */}
          <div className={cn("absolute inset-0", !rect && "bg-black/62")} aria-hidden="true" />
          {rect ? (
            <motion.div
              aria-hidden="true"
              className="tour-spotlight pointer-events-none absolute rounded-2xl"
              initial={false}
              animate={{ top: rect.top, left: rect.left, width: rect.width, height: rect.height }}
              transition={spring}
            />
          ) : null}

          <motion.div
            ref={cardRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            aria-describedby={bodyId}
            tabIndex={-1}
            className="absolute rounded-2xl border border-border bg-card p-4 text-foreground shadow-2xl outline-none sm:p-5"
            style={{ width }}
            initial={reduceMotion ? false : { opacity: 0, y: 10, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1, top: cardStyle.top, left: cardStyle.left }}
            transition={spring}
          >
            <div className="flex items-start justify-between gap-3">
              <p className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-foreground/70">
                <Sparkles className="size-3.5 text-primary" aria-hidden="true" />
                Guía · {index + 1} de {active.length}
              </p>
              <button
                type="button"
                onClick={close}
                aria-label="Cerrar guía"
                className="-mr-1 -mt-1 grid size-7 shrink-0 place-items-center rounded-full text-foreground/70 transition-colors hover:bg-foreground/10 hover:text-foreground"
              >
                <X className="size-4" aria-hidden="true" />
              </button>
            </div>

            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={index}
                initial={reduceMotion ? false : { opacity: 0, x: 8 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -8 }}
                transition={{ duration: reduceMotion ? 0 : 0.16 }}
              >
                <h2 id={titleId} className="mt-2 text-base font-semibold tracking-[-0.02em] text-balance">
                  {step.title}
                </h2>
                <div id={bodyId} className="mt-1.5 space-y-2 text-sm leading-relaxed text-foreground/80">
                  {step.body}
                </div>
              </motion.div>
            </AnimatePresence>

            <div className="mt-4 flex items-center justify-between gap-3">
              <div className="flex items-center gap-1" aria-hidden="true">
                {active.map((_, dot) => (
                  <motion.span
                    key={dot}
                    layout
                    transition={{ type: "spring", visualDuration: 0.25, bounce: 0.15 }}
                    className={cn("block h-1.25 rounded-[3px]", dot === index ? "w-4.25 bg-primary" : "w-1.25 bg-foreground/30")}
                  />
                ))}
              </div>
              <div className="flex items-center gap-1.5">
                {index > 0 ? (
                  <Button variant="outline" size="icon" onClick={() => setIndex((i) => i - 1)} aria-label="Paso anterior">
                    <ArrowLeft />
                  </Button>
                ) : (
                  <Button variant="ghost" onClick={close} className="text-foreground/80">
                    Saltar
                  </Button>
                )}
                <Button onClick={() => (isLast ? close() : setIndex((i) => i + 1))} className="px-3.5">
                  {isLast ? "¡Entendido!" : "Siguiente"}
                  {!isLast && <ArrowRight data-icon="inline-end" />}
                </Button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>,
    document.body,
  );
}
