"use client";

import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { useModal } from "@/components/modal";
import { Button } from "@/components/ui/button";

type Placement = "top" | "bottom" | "left" | "right";

type TooltipProps = {
  content: ReactNode;
  label?: string;
} & (
  | { type?: "floating"; position?: Placement }
  | { type: "modal"; title: string; description: string }
);

const GAP = 12;
const EDGE = 12;
const ARROW = 10;

function FloatingTooltip({ content, label, position = "top" }: { content: ReactNode; label: string; position?: Placement }) {
  const [open, setOpen] = useState(false);
  const [layout, setLayout] = useState<{ placement: Placement; top: number; left: number; arrow: number } | null>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const id = useId();

  const updatePosition = useCallback(() => {
    if (!buttonRef.current || !tooltipRef.current) return;
    const button = buttonRef.current.getBoundingClientRect();
    const tooltip = tooltipRef.current.getBoundingClientRect();
    const available: Record<Placement, number> = {
      top: button.top - EDGE,
      bottom: window.innerHeight - button.bottom - EDGE,
      left: button.left - EDGE,
      right: window.innerWidth - button.right - EDGE,
    };
    const required = (side: Placement) => (side === "top" || side === "bottom" ? tooltip.height : tooltip.width) + GAP;
    const order: Placement[] = [position, ...(["top", "bottom", "right", "left"] as Placement[]).filter((side) => side !== position)];
    const placement = order.find((side) => available[side] >= required(side)) ?? order.reduce((best, side) => available[side] > available[best] ? side : best);
    const clamp = (value: number, size: number, viewport: number) => Math.max(EDGE, Math.min(value, viewport - size - EDGE));
    const vertical = placement === "top" || placement === "bottom";
    const left = clamp(vertical ? button.left + button.width / 2 - tooltip.width / 2 : placement === "left" ? button.left - tooltip.width - GAP : button.right + GAP, tooltip.width, window.innerWidth);
    const top = clamp(vertical ? placement === "top" ? button.top - tooltip.height - GAP : button.bottom + GAP : button.top + button.height / 2 - tooltip.height / 2, tooltip.height, window.innerHeight);
    const arrow = vertical
      ? Math.max(ARROW, Math.min(button.left + button.width / 2 - left, tooltip.width - ARROW))
      : Math.max(ARROW, Math.min(button.top + button.height / 2 - top, tooltip.height - ARROW));
    setLayout({ placement, top, left, arrow });
  }, [position]);

  useLayoutEffect(() => {
    if (!open) return;
    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [open, content, updatePosition]);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!buttonRef.current?.contains(event.target as Node) && !tooltipRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        buttonRef.current?.focus();
      }
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const placement = layout?.placement ?? position;
  const arrowStyle: CSSProperties = placement === "top"
    ? { bottom: -ARROW, left: (layout?.arrow ?? 0) - ARROW / 2, clipPath: "polygon(0 0, 100% 0, 50% 100%)" }
    : placement === "bottom"
      ? { top: -ARROW, left: (layout?.arrow ?? 0) - ARROW / 2, clipPath: "polygon(50% 0, 100% 100%, 0 100%)" }
      : placement === "left"
        ? { right: -ARROW, top: (layout?.arrow ?? 0) - ARROW / 2, clipPath: "polygon(0 0, 100% 50%, 0 100%)" }
        : { left: -ARROW, top: (layout?.arrow ?? 0) - ARROW / 2, clipPath: "polygon(100% 0, 100% 100%, 0 50%)" };

  return (
    <>
      <Button ref={buttonRef} type="button" variant="outline" size="icon-xs" className="rounded-full font-bold" aria-label={label} aria-describedby={open ? id : undefined} aria-expanded={open} onBlur={() => setOpen(false)} onClick={() => { setLayout(null); setOpen((current) => !current); }}>?</Button>
      {open && createPortal(
        <div
          ref={tooltipRef}
          id={id}
          role="tooltip"
          className="fixed z-50 max-w-[min(18rem,calc(100vw-24px))] rounded-xl bg-foreground px-3 py-2 text-sm leading-relaxed text-background shadow-lg"
          style={{ top: layout?.top ?? 0, left: layout?.left ?? 0, visibility: layout ? "visible" : "hidden" }}
        >
          {content}
          <span aria-hidden="true" className="absolute size-2.5 bg-foreground" style={arrowStyle} />
        </div>,
        document.body,
      )}
    </>
  );
}

function ModalTooltip({ content, label, title, description }: { content: ReactNode; label: string; title: string; description: string }) {
  const { open } = useModal();
  return (
    <Button type="button" variant="outline" size="icon-xs" className="rounded-full font-bold" aria-label={label} aria-haspopup="dialog" onClick={() => open(content, { title, description })}>?</Button>
  );
}

export function Tooltip(props: TooltipProps) {
  const label = props.label ?? "Más información";
  if (props.type === "modal") return <ModalTooltip content={props.content} label={label} title={props.title} description={props.description} />;
  return <FloatingTooltip content={props.content} label={label} position={props.position} />;
}
