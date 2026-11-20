"use client";

import { useEffect, useId, useLayoutEffect, useRef, useState, type CSSProperties } from "react";
import { motion, useReducedMotion } from "motion/react";
import { Lightbulb, X } from "lucide-react";
import { CARD_PALETTES, pickCardVariant } from "@/lib/helpers/color";
import { findGuideTarget, isInViewport } from "@/lib/guides/dom";
import { renderGuideBody, type GuideContext, type GuideTip as Tip } from "@/lib/guides/types";

type Side = "top" | "bottom" | "left" | "right";
type Layout = { side: Side; x: number; y: number; arrow: number; target: DOMRect };

const GAP = 12;
const EDGE = 12;
const ARROW = 10;
const ORDER: Side[] = ["bottom", "top", "right", "left"];

type GuideTipProps = {
  tip: Tip;
  context: GuideContext;
  /** Storefront brand color: the bubble is painted with it and picks its text color for contrast. */
  color: string;
  onClose: () => void;
};

/**
 * A hint bubble anchored to an element, in the storefront's primary color. It doesn't block the
 * page or take focus; it stays hidden while its target is scrolled out of view.
 */
export function GuideTip({ tip, context, color, onClose }: GuideTipProps) {
  const [layout, setLayout] = useState<Layout | null>(null);
  const bubbleRef = useRef<HTMLDivElement>(null);
  const reduceMotion = useReducedMotion();
  const labelId = useId();
  const palette = CARD_PALETTES[pickCardVariant(color)];

  useLayoutEffect(() => {
    let frame = 0;
    const update = () => {
      const target = findGuideTarget(tip.target);
      const bubble = bubbleRef.current;
      if (!target || !bubble || !isInViewport(target)) {
        setLayout(null);
        return;
      }
      const box = target.getBoundingClientRect();
      const { width, height } = bubble.getBoundingClientRect();
      const room: Record<Side, number> = {
        top: box.top - EDGE,
        bottom: window.innerHeight - box.bottom - EDGE,
        left: box.left - EDGE,
        right: window.innerWidth - box.right - EDGE,
      };
      const needed = (side: Side) => (side === "top" || side === "bottom" ? height : width) + GAP;
      const side = ORDER.find((candidate) => room[candidate] >= needed(candidate)) ?? "bottom";
      const vertical = side === "top" || side === "bottom";
      const clamp = (value: number, size: number, limit: number) => Math.max(EDGE, Math.min(value, limit - size - EDGE));
      const x = clamp(vertical ? box.left + box.width / 2 - width / 2 : side === "left" ? box.left - width - GAP : box.right + GAP, width, window.innerWidth);
      const y = clamp(vertical ? (side === "top" ? box.top - height - GAP : box.bottom + GAP) : box.top + box.height / 2 - height / 2, height, window.innerHeight);
      const arrow = vertical
        ? Math.max(ARROW + 4, Math.min(box.left + box.width / 2 - x, width - ARROW - 4))
        : Math.max(ARROW + 4, Math.min(box.top + box.height / 2 - y, height - ARROW - 4));
      setLayout({ side, x, y, arrow, target: box });
    };
    const schedule = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(update);
    };

    update();
    const observer = new ResizeObserver(schedule);
    if (bubbleRef.current) observer.observe(bubbleRef.current);
    const target = findGuideTarget(tip.target);
    if (target) observer.observe(target);
    window.addEventListener("resize", schedule);
    window.addEventListener("scroll", schedule, true);
    // Layout shifts that don't resize the target (a sidebar collapsing, content streaming in above).
    const mutations = new MutationObserver(schedule);
    mutations.observe(document.body, { childList: true, subtree: true });
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      mutations.disconnect();
      window.removeEventListener("resize", schedule);
      window.removeEventListener("scroll", schedule, true);
    };
  }, [tip.target]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape" && bubbleRef.current?.contains(document.activeElement)) onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  const side = layout?.side ?? "bottom";
  const arrowStyle: CSSProperties =
    side === "bottom"
      ? { top: -ARROW + 1, left: (layout?.arrow ?? 0) - ARROW, clipPath: "polygon(50% 0, 100% 100%, 0 100%)" }
      : side === "top"
        ? { bottom: -ARROW + 1, left: (layout?.arrow ?? 0) - ARROW, clipPath: "polygon(0 0, 100% 0, 50% 100%)" }
        : side === "right"
          ? { left: -ARROW + 1, top: (layout?.arrow ?? 0) - ARROW, clipPath: "polygon(100% 0, 100% 100%, 0 50%)" }
          : { right: -ARROW + 1, top: (layout?.arrow ?? 0) - ARROW, clipPath: "polygon(0 0, 100% 50%, 0 100%)" };
  const offset = { top: { y: 6 }, bottom: { y: -6 }, left: { x: 6 }, right: { x: -6 } }[side];

  return (
    <>
      {/* A ring around the element the tip talks about. */}
      {layout ? (
        <div
          aria-hidden="true"
          className="pointer-events-none fixed left-0 top-0 z-40 rounded-xl ring-2 ring-primary ring-offset-2 ring-offset-background"
          style={{
            transform: `translate(${layout.target.left - 4}px, ${layout.target.top - 4}px)`,
            width: layout.target.width + 8,
            height: layout.target.height + 8,
          }}
        />
      ) : null}
      {/* Positioned without animation so it tracks scrolling exactly; the inner layer animates the entrance. */}
      <div
        ref={bubbleRef}
        className="fixed left-0 top-0 z-40 w-max max-w-[min(18rem,calc(100vw-24px))]"
        style={{ transform: `translate(${layout?.x ?? 0}px, ${layout?.y ?? 0}px)`, visibility: layout ? "visible" : "hidden" }}
      >
      <motion.div
        role="note"
        aria-labelledby={labelId}
        className="relative rounded-2xl bg-primary py-3 pl-3.5 pr-10 text-sm leading-relaxed shadow-xl [&_.guide-term]:text-current [&_.guide-term]:decoration-current"
        style={{ color: palette.text, transformOrigin: { top: "50% 100%", bottom: "50% 0%", left: "100% 50%", right: "0% 50%" }[side] }}
        initial={reduceMotion ? false : { opacity: 0, scale: 0.92, ...offset }}
        animate={{ opacity: 1, scale: 1, x: 0, y: 0 }}
        exit={reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.95 }}
        transition={reduceMotion ? { duration: 0 } : { type: "spring", visualDuration: 0.3, bounce: 0.2 }}
      >
        <div className="flex gap-2">
          <Lightbulb className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          <div id={labelId} className="space-y-1.5">
            <span className="sr-only">Consejo: </span>
            {renderGuideBody(tip.body, context)}
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Cerrar consejo"
          className="absolute right-2 top-2 grid size-7 place-items-center rounded-full border transition-opacity hover:opacity-80 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-current"
          style={{ background: palette.chipBg, borderColor: palette.chipBorder, color: palette.text }}
        >
          <X className="size-3.5" aria-hidden="true" />
        </button>
        <span aria-hidden="true" className="absolute size-5 bg-primary" style={arrowStyle} />
      </motion.div>
      </div>
    </>
  );
}
