"use client";

import { useCallback, useEffect, useId, useRef, useState, type CSSProperties, type KeyboardEvent, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { EllipsisVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/helpers/utils";

export type ActionsMenuItem = {
  label: string;
  icon?: ReactNode;
  onSelect: () => void;
  destructive?: boolean;
};

const VIEWPORT_MARGIN = 8;
const GAP = 6;
/** Item height + vertical padding, to decide whether the menu fits below the trigger before it renders. */
const ITEM_HEIGHT = 40;
const MENU_PADDING = 14;

/**
 * A "more actions" button that opens a menu (WAI-ARIA menu button pattern). The menu is portaled
 * to `body` with fixed coordinates, so cards with `overflow-hidden` or scrolling lists don't clip it;
 * it flips above the trigger when there's no room below, and closes on scroll or resize.
 */
export function ActionsMenu({ label, items, className }: { label: string; items: ActionsMenuItem[]; className?: string }) {
  const [position, setPosition] = useState<CSSProperties | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const menuId = useId();
  const open = position !== null;

  const close = useCallback((restoreFocus: boolean) => {
    setPosition(null);
    if (restoreFocus) triggerRef.current?.focus();
  }, []);

  const toggle = () => {
    if (open) return close(false);
    const rect = triggerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const height = items.length * ITEM_HEIGHT + MENU_PADDING;
    const fitsBelow = rect.bottom + GAP + height <= window.innerHeight - VIEWPORT_MARGIN;
    setPosition({
      position: "fixed",
      right: Math.max(VIEWPORT_MARGIN, window.innerWidth - rect.right),
      ...(fitsBelow ? { top: rect.bottom + GAP } : { bottom: window.innerHeight - rect.top + GAP }),
    });
  };

  useEffect(() => {
    if (!open) return;
    menuRef.current?.querySelector<HTMLElement>('[role="menuitem"]')?.focus();

    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node;
      if (!menuRef.current?.contains(target) && !triggerRef.current?.contains(target)) close(false);
    };
    // Fixed coordinates go stale once anything scrolls or the viewport changes.
    const onViewportChange = () => close(false);

    document.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("scroll", onViewportChange, true);
    window.addEventListener("resize", onViewportChange);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("scroll", onViewportChange, true);
      window.removeEventListener("resize", onViewportChange);
    };
  }, [open, close]);

  const onMenuKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const menuItems = Array.from(menuRef.current?.querySelectorAll<HTMLElement>('[role="menuitem"]') ?? []);
    const index = menuItems.indexOf(document.activeElement as HTMLElement);
    const focusAt = (i: number) => menuItems[(i + menuItems.length) % menuItems.length]?.focus();

    switch (event.key) {
      case "ArrowDown":
        event.preventDefault();
        focusAt(index + 1);
        break;
      case "ArrowUp":
        event.preventDefault();
        focusAt(index - 1);
        break;
      case "Home":
        event.preventDefault();
        focusAt(0);
        break;
      case "End":
        event.preventDefault();
        focusAt(menuItems.length - 1);
        break;
      case "Escape":
      case "Tab":
        event.preventDefault();
        close(true);
        break;
    }
  };

  return (
    <>
      <Button
        ref={triggerRef}
        type="button"
        variant="ghost"
        size="icon"
        aria-label={label}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        onClick={toggle}
        className={cn("size-10 rounded-xl", className)}
      >
        <EllipsisVertical className="size-4" aria-hidden="true" />
      </Button>

      {open &&
        createPortal(
          <div
            ref={menuRef}
            id={menuId}
            role="menu"
            aria-label={label}
            style={position}
            onKeyDown={onMenuKeyDown}
            className="z-40 min-w-44 rounded-xl border border-border bg-card p-1.5 text-foreground shadow-lg"
          >
            {items.map((item) => (
              <button
                key={item.label}
                type="button"
                role="menuitem"
                tabIndex={-1}
                onClick={() => {
                  close(true);
                  item.onSelect();
                }}
                className={cn(
                  "flex h-10 w-full items-center gap-2.5 rounded-lg px-3 text-left text-sm font-medium transition-colors hover:bg-foreground/10 focus-visible:bg-foreground/10 focus-visible:outline-none motion-reduce:transition-none [&_svg]:size-4 [&_svg]:shrink-0",
                  item.destructive && "text-red-700 dark:text-red-300",
                )}
              >
                {item.icon}
                {item.label}
              </button>
            ))}
          </div>,
          document.body,
        )}
    </>
  );
}
