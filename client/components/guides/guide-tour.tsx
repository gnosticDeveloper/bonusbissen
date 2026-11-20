"use client";

import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { ArrowLeft, ArrowRight, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/helpers/utils";
import { findGuideTarget } from "@/lib/guides/dom";
import { renderGuideBody, type GuideContext, type GuideStep } from "@/lib/guides/types";

export type TourStep = GuideStep & { isNew: boolean };

/** `first`: never seen. `update`: steps added after the user finished the tour. `replay`: asked for from Ayuda. */
export type TourMode = "first" | "update" | "replay";

type Rect = { top: number; left: number; width: number; height: number };

const PADDING = 8;
const GAP = 14;
const EDGE = 12;
const CARD_WIDTH = 352;

function measure(element: HTMLElement): Rect {
  const rect = element.getBoundingClientRect();
  return { top: rect.top - PADDING, left: rect.left - PADDING, width: rect.width + PADDING * 2, height: rect.height + PADDING * 2 };
}

const FOCUSABLE = 'button:not([disabled]), [href], input:not([disabled]), [tabindex]:not([tabindex="-1"])';

type GuideTourProps = {
  steps: TourStep[];
  mode: TourMode;
  context: GuideContext;
  onStepShown: (step: TourStep) => void;
  onClose: () => void;
};

/**
 * Spotlight tour over the dashboard. Blocks the page while open; each step points at its target
 * (scrolled into view and followed while it moves) or shows centered when it has none.
 * Rendered inside the dashboard shell so `bg-primary` is the storefront's color.
 */
export function GuideTour({ steps, mode, context, onStepShown, onClose }: GuideTourProps) {
  const [index, setIndex] = useState(0);
  const [rect, setRect] = useState<Rect | null>(null);
  const [cardHeight, setCardHeight] = useState(220);
  const [viewport, setViewport] = useState(() => ({ width: window.innerWidth, height: window.innerHeight }));
  const cardRef = useRef<HTMLDivElement>(null);
  const reduceMotion = useReducedMotion();
  const titleId = useId();
  const bodyId = useId();

  const step = steps[index];
  const isLast = index === steps.length - 1;
  const next = useCallback(() => (isLast ? onClose() : setIndex((i) => i + 1)), [isLast, onClose]);
  const previous = useCallback(() => setIndex((i) => Math.max(i - 1, 0)), []);

  useEffect(() => {
    if (step) onStepShown(step);
  }, [step, onStepShown]);

  // Locate the current target, bring it into view and keep following it.
  useLayoutEffect(() => {
    if (!step) return;
    const element = step.target ? findGuideTarget(step.target) : null;
    const update = () => {
      setViewport({ width: window.innerWidth, height: window.innerHeight });
      setRect(element?.isConnected ? measure(element) : null);
    };

    if (!element) {
      update();
      return;
    }

    const box = element.getBoundingClientRect();
    if (box.top < 80 || box.bottom > window.innerHeight - 80) {
      element.scrollIntoView({ block: "center", behavior: reduceMotion ? "auto" : "smooth" });
    }

    let frame = 0;
    const schedule = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(update);
    };
    update();
    const observer = new ResizeObserver(schedule);
    observer.observe(element);
    window.addEventListener("resize", schedule);
    window.addEventListener("scroll", schedule, true);
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      window.removeEventListener("resize", schedule);
      window.removeEventListener("scroll", schedule, true);
    };
  }, [step, reduceMotion]);

  useLayoutEffect(() => {
    if (cardRef.current) setCardHeight(cardRef.current.offsetHeight);
  }, [index, rect, viewport.width]);

  useEffect(() => {
    cardRef.current?.focus({ preventScroll: true });
  }, []);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      // Keys inside a glossary dialog belong to that dialog.
      if ((event.target as Element | null)?.closest?.("dialog")) return;
      if (event.key === "Escape") onClose();
      else if (event.key === "ArrowRight") setIndex((i) => Math.min(i + 1, steps.length - 1));
      else if (event.key === "ArrowLeft") previous();
      else if (event.key === "Tab" && cardRef.current) {
        // Keep focus inside the card: the page behind is blocked.
        const focusable = [...cardRef.current.querySelectorAll<HTMLElement>(FOCUSABLE)];
        if (focusable.length === 0) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        const active = document.activeElement;
        if (event.shiftKey && (active === first || active === cardRef.current)) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && (active === last || !cardRef.current.contains(active))) {
          event.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose, previous, steps.length]);

  if (!step) return null;

  const mobile = viewport.width < 640;
  const width = Math.min(CARD_WIDTH, viewport.width - EDGE * 2);

  // Below the target when it fits, otherwise above, otherwise beside it; centered without a target.
  let position: { x: number; y: number };
  if (!rect) {
    position = { x: (viewport.width - width) / 2, y: Math.max(EDGE, (viewport.height - cardHeight) / 2) };
  } else if (mobile) {
    const targetCenter = rect.top + rect.height / 2;
    position = { x: EDGE, y: targetCenter < viewport.height / 2 ? viewport.height - cardHeight - EDGE - 8 : EDGE + 8 };
  } else {
    const below = rect.top + rect.height + GAP;
    const above = rect.top - GAP - cardHeight;
    let y = below + cardHeight <= viewport.height - EDGE ? below : above >= EDGE ? above : Number.NaN;
    let x = rect.left + rect.width / 2 - width / 2;
    if (Number.isNaN(y)) {
      y = Math.min(Math.max(EDGE, rect.top + rect.height / 2 - cardHeight / 2), viewport.height - cardHeight - EDGE);
      const right = rect.left + rect.width + GAP;
      x = right + width <= viewport.width - EDGE ? right : rect.left - GAP - width;
    }
    position = { x: Math.max(EDGE, Math.min(x, viewport.width - width - EDGE)), y };
  }

  const spring = reduceMotion ? { duration: 0 } : ({ type: "spring", stiffness: 380, damping: 36 } as const);

  return (
    <motion.div
      className="fixed inset-0 z-70"
      initial={reduceMotion ? false : { opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: reduceMotion ? 0 : 0.2 }}
    >
      {/* Blocks the page while the guide is open; the spotlight itself is only visual. */}
      <div className={cn("absolute inset-0", !rect && "bg-black/60")} aria-hidden="true" />
      {rect ? (
        <motion.div
          aria-hidden="true"
          className="guide-spotlight pointer-events-none absolute left-0 top-0 rounded-2xl"
          initial={false}
          animate={{ x: rect.left, y: rect.top, width: rect.width, height: rect.height }}
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
        className="absolute left-0 top-0 overflow-hidden rounded-2xl border border-border bg-card text-foreground shadow-2xl outline-none"
        style={{ width }}
        initial={reduceMotion ? false : { opacity: 0, scale: 0.97, x: position.x, y: position.y + 10 }}
        animate={{ opacity: 1, scale: 1, x: position.x, y: position.y }}
        transition={spring}
      >
        {/* Progress: one segment per step, filled up to the current one. */}
        <div className="flex gap-1 px-4 pt-4 sm:px-5" aria-hidden="true">
          {steps.map((candidate, i) => (
            <span key={candidate.id} className="relative h-1 flex-1 overflow-hidden rounded-full bg-foreground/12">
              <motion.span
                className="absolute inset-0 origin-left rounded-full bg-primary"
                initial={false}
                animate={{ scaleX: i <= index ? 1 : 0 }}
                transition={reduceMotion ? { duration: 0 } : { type: "spring", visualDuration: 0.3, bounce: 0 }}
              />
            </span>
          ))}
        </div>

        <div className="p-4 pt-3 sm:p-5 sm:pt-3">
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs text-foreground/75">
              {mode === "update" ? `${steps.some((candidate) => candidate.isNew) ? "Novedades" : "Más"} en esta pantalla, paso` : "Paso"}{" "}
              {index + 1} de {steps.length}
            </p>
            <button
              type="button"
              onClick={onClose}
              aria-label="Cerrar guía"
              className="-mr-1.5 grid size-7 shrink-0 place-items-center rounded-full text-foreground/70 transition-colors hover:bg-foreground/10 hover:text-foreground focus-visible:outline-2 focus-visible:outline-primary"
            >
              <X className="size-4" aria-hidden="true" />
            </button>
          </div>

          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={step.id}
              initial={reduceMotion ? false : { opacity: 0, x: 8 }}
              animate={{ opacity: 1, x: 0 }}
              exit={reduceMotion ? { opacity: 0 } : { opacity: 0, x: -8 }}
              transition={{ duration: reduceMotion ? 0 : 0.16 }}
            >
              <h2 id={titleId} className="mt-2 flex flex-wrap items-center gap-2 text-[17px] font-semibold leading-snug tracking-[-0.02em] text-balance">
                {step.title}
                {step.isNew ? <span className="rounded-full bg-primary px-2 py-0.5 text-[11px] font-semibold tracking-normal text-primary-foreground">Nuevo</span> : null}
              </h2>
              <div id={bodyId} className="mt-1.5 space-y-2 text-sm leading-relaxed text-foreground/85">
                {renderGuideBody(step.body, context)}
              </div>
            </motion.div>
          </AnimatePresence>

          <div className="mt-4 flex items-center justify-end gap-1.5">
            {index > 0 ? (
              <Button variant="outline" size="icon" onClick={previous} aria-label="Paso anterior">
                <ArrowLeft />
              </Button>
            ) : steps.length > 1 ? (
              <Button variant="ghost" onClick={onClose} className="text-foreground/80">
                Saltar
              </Button>
            ) : null}
            <Button onClick={next} className="px-3.5">
              {isLast ? "Entendido" : "Siguiente"}
              {!isLast && <ArrowRight data-icon="inline-end" />}
            </Button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
