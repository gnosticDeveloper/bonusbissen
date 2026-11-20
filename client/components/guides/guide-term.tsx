"use client";

import { useCallback, useId, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { BookOpen, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { GLOSSARY, type GlossaryTermId } from "@/lib/guides/glossary";
import { GUIDE_ROOT_ID } from "@/lib/guides/dom";

/**
 * A word that needs explaining: underlined in the storefront color, opens its glossary entry in a
 * native modal dialog. The dialog is portaled into the dashboard shell so it inherits the
 * storefront's `--primary` and never nests inside the paragraph the term sits in.
 *
 * The dialog is opened from the click itself (or, on the first click, as soon as it is attached)
 * and closed only by the user. Opening/closing it from an effect breaks under Strict Mode: the
 * simulated unmount closes it, and the queued `close` event then unmounts it right after reopening.
 */
export function Term({ id, children }: { id: GlossaryTermId; children?: ReactNode }) {
  // Rendered on the first click and kept afterwards, so the server never renders a portal.
  const [rendered, setRendered] = useState(false);
  const dialogRef = useRef<HTMLDialogElement | null>(null);
  const openOnAttach = useRef(false);
  const entry = GLOSSARY[id];

  const attachDialog = useCallback((node: HTMLDialogElement | null) => {
    dialogRef.current = node;
    if (node && openOnAttach.current && !node.open) {
      openOnAttach.current = false;
      node.showModal();
    }
  }, []);

  function open() {
    const dialog = dialogRef.current;
    if (dialog?.isConnected) {
      if (!dialog.open) dialog.showModal();
      return;
    }
    openOnAttach.current = true;
    setRendered(true);
  }

  return (
    <>
      <button
        type="button"
        aria-haspopup="dialog"
        onClick={open}
        className="guide-term inline cursor-help rounded-sm p-0 align-baseline font-semibold text-brand-ink underline decoration-primary decoration-2 underline-offset-[3px] transition-colors hover:decoration-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
      >
        {children ?? entry.label}
      </button>
      {rendered ? <TermDialog id={id} dialogRef={attachDialog} onDismiss={() => dialogRef.current?.close()} /> : null}
    </>
  );
}

type TermDialogProps = {
  id: GlossaryTermId;
  dialogRef: (node: HTMLDialogElement | null) => void;
  onDismiss: () => void;
};

function TermDialog({ id, dialogRef, onDismiss }: TermDialogProps) {
  const titleId = useId();
  const entry = GLOSSARY[id];

  const dialog = (
    <dialog
      ref={dialogRef}
      aria-labelledby={titleId}
      // A click on the backdrop lands on the dialog element itself.
      onClick={(event) => {
        if (event.target === event.currentTarget) onDismiss();
      }}
      className="guide-term-dialog m-auto w-[min(26rem,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-border bg-card p-0 text-foreground shadow-2xl backdrop:bg-black/55"
    >
      <div className="h-1.5 bg-primary" aria-hidden="true" />
      <div className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-primary/15 text-foreground">
              <BookOpen className="size-4" aria-hidden="true" />
            </span>
            <h2 id={titleId} className="text-lg font-semibold tracking-[-0.02em]">
              {entry.label}
            </h2>
          </div>
          <Button variant="ghost" size="icon-sm" onClick={onDismiss} aria-label="Cerrar explicación" className="-mr-1 -mt-1 rounded-full">
            <X />
          </Button>
        </div>
        <div className="mt-3 space-y-2 text-sm leading-relaxed text-foreground/85">
          {entry.definition.map((paragraph) => (
            <p key={paragraph}>{paragraph}</p>
          ))}
        </div>
        <div className="mt-5 flex justify-end">
          <Button onClick={onDismiss} className="px-3.5">
            Entendido
          </Button>
        </div>
      </div>
    </dialog>
  );

  return createPortal(dialog, document.getElementById(GUIDE_ROOT_ID) ?? document.body);
}
