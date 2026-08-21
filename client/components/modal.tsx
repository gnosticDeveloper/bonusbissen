"use client";

import { cn } from "@/lib/utils";
import { createContext, ReactNode, useContext, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";

type ModalHeaderText = {
  title: string;
  description: string;
};

interface ContextType {
  modal: React.ReactNode | null;
  open: (content: React.ReactNode, options: ModalHeaderText) => void;
  close: () => void;
}

const ModalContext = createContext<ContextType>({
  modal: null,
  open: () => {},
  close: () => {},
});

export function useModal() {
  return useContext(ModalContext);
}

export function ModalProvider({ children }: { children: ReactNode }) {
  const [modal, setModal] = useState<React.ReactNode | null>(null);
  const [modalTitle, setModalTitle] = useState<string | null>(null);
  const [modalDesc, setModalDesc] = useState<string | null>(null);

  const isOpen = Boolean(modal);

  const open = (m: React.ReactNode, options: ModalHeaderText) => {
    setModal(m);
    setModalTitle(options.title);
    setModalDesc(options.description);
  };

  const close = () => {
    setModal(null);
    setModalTitle(null);
    setModalDesc(null);
  };

  useEffect(() => {
    if (!modal) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [modal]);

  return (
    <ModalContext.Provider value={{ modal, open, close }}>
      {isOpen ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
          <button type="button" aria-label="Cerrar" className="absolute inset-0 bg-foreground/40 backdrop-blur-sm" onClick={close} />
          <div
            role="dialog"
            aria-modal="true"
            aria-label={modalTitle ?? ""}
            className={cn(
              "relative z-10 flex max-h-[92dvh] w-full flex-col overflow-hidden rounded-t-2xl border border-border bg-card text-card-foreground shadow-xl sm:max-w-lg sm:rounded-2xl",
              // className,
            )}
          >
            <div className="flex items-start justify-between gap-3 border-b border-border p-4 sm:p-5">
              <div className="flex flex-col gap-1">
                <h2 className="text-base font-semibold text-balance">{modalTitle}</h2>
                {modalDesc ? <p className="text-sm text-muted-foreground leading-relaxed">{modalDesc}</p> : null}
              </div>
              <Button variant="ghost" size="icon-sm" onClick={close} aria-label="Cerrar">
                <X />
              </Button>
            </div>
            <div className="overflow-y-auto p-4 sm:p-5">{modal}</div>
          </div>
        </div>
      ) : null}
      {children}
    </ModalContext.Provider>
  );
}
