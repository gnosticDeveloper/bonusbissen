"use client";

import { useRef } from "react";
import { useFocusTrap } from "@/lib/use-focus-trap";

type ModalProps = {
  onCloseAction: () => void;
  children: React.ReactNode;
  labelledBy?: string;
  className?: string;
  align?: "center" | "end";
};

export default function Modal({ onCloseAction, children, labelledBy, className, align = "center" }: ModalProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  useFocusTrap(panelRef, onCloseAction, true);

  return (
    <div
      className={`fixed inset-0 z-50 flex ${align === "end" ? "items-end sm:items-center" : "items-center"} justify-center bg-black/50 px-4 py-6`}
      onClick={(e) => {
        if (e.target === e.currentTarget) onCloseAction();
      }}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
        className={`max-h-full overflow-y-auto ${className ?? ""}`}
      >
        {children}
      </div>
    </div>
  );
}
