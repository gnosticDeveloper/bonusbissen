"use client";

import { createContext, ReactNode, useCallback, useContext, useEffect, useId, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion, useDragControls, useReducedMotion, type PanInfo } from "motion/react";
import { X } from "lucide-react";
import { ActionStatusModal } from "@/components/modals/action-status-modal";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/helpers/utils";
import { ActionResult } from "@/lib/api";

type ModalHeaderText = {
  title: string;
  description: string;
};

/**
 * `default` renders the shared header (title, description, close button) above padded content.
 * `sheet` renders the content edge to edge as a bottom sheet on mobile: the content owns its
 * header and close control, and must label the dialog with `ModalTitle` (and `ModalDescription`).
 */
type ModalOptions = (ModalHeaderText & { variant?: "default" }) | { variant: "sheet" };

type OpenModalOptions = ModalOptions & {
  dismissible?: boolean;
};

// A downward drag past either threshold dismisses a sheet; anything less springs back.
const SHEET_DISMISS_OFFSET = 96;
const SHEET_DISMISS_VELOCITY = 600;

type ActionMessages<T> = {
  loading: ModalHeaderText;
  success: ModalHeaderText | ((data: T) => ModalHeaderText);
  errorTitle?: string;
};

type ModalState = {
  content: ReactNode;
  key: number;
  options: OpenModalOptions;
};

interface ContextType {
  open: (content: ReactNode, options: OpenModalOptions) => void;
  close: () => void;
  runWithStatus: <T>(action: () => Promise<ActionResult<T>>, messages: ActionMessages<T>) => Promise<ActionResult<T>>;
}

const ModalContext = createContext<ContextType | null>(null);

/** The ids the open dialog is labelled by, for content that renders its own header (`variant: "sheet"`). */
const ModalLabelsContext = createContext<{ titleId: string; descriptionId: string } | null>(null);

export function ModalTitle({ className, children }: { className?: string; children: ReactNode }) {
  const labels = useContext(ModalLabelsContext);
  return (
    <h2 id={labels?.titleId} className={className}>
      {children}
    </h2>
  );
}

export function ModalDescription({ className, children }: { className?: string; children: ReactNode }) {
  const labels = useContext(ModalLabelsContext);
  return (
    <p id={labels?.descriptionId} className={className}>
      {children}
    </p>
  );
}

export function useModal() {
  const context = useContext(ModalContext);
  if (!context) throw new Error("useModal must be used within ModalProvider");
  return context;
}

export function ModalProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<ModalState | null>(null);
  const sequence = useRef(0);
  const titleId = useId();
  const descriptionId = useId();
  const reduceMotion = useReducedMotion();
  const dragControls = useDragControls();
  const labels = useMemo(() => ({ titleId, descriptionId }), [titleId, descriptionId]);

  const setModal = useCallback((content: ReactNode, options: OpenModalOptions) => {
    sequence.current += 1;
    setState({ content, key: sequence.current, options });
  }, []);

  const close = useCallback(() => setState(null), []);

  const open = useCallback(
    (content: ReactNode, options: OpenModalOptions) => {
      setModal(content, { ...options, dismissible: options.dismissible ?? true });
    },
    [setModal],
  );

  const runWithStatus = useCallback(
    async <T,>(action: () => Promise<ActionResult<T>>, messages: ActionMessages<T>): Promise<ActionResult<T>> => {
      setModal(<ActionStatusModal status="loading" onClose={close} />, { ...messages.loading, dismissible: false });

      try {
        const result = await action();

        if (result.ok) {
          const success = typeof messages.success === "function" ? messages.success(result.data) : messages.success;
          setModal(<ActionStatusModal status="success" onClose={close} />, { ...success, dismissible: true });
        } else {
          setModal(<ActionStatusModal status="error" onClose={close} />, {
            title: messages.errorTitle ?? "No pudimos completar la acción",
            description: result.error,
            dismissible: true,
          });
        }

        return result;
      } catch (error) {
        const result: ActionResult<T> = {
          ok: false,
          error: error instanceof Error ? error.message : "Ocurrió un error inesperado. Intentá nuevamente.",
        };
        setModal(<ActionStatusModal status="error" onClose={close} />, {
          title: messages.errorTitle ?? "No pudimos completar la acción",
          description: result.error,
          dismissible: true,
        });
        return result;
      }
    },
    [close, setModal],
  );

  useEffect(() => {
    if (!state) return;

    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape" && state.options.dismissible) close();
    };
    document.addEventListener("keydown", onKey);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previousOverflow;
    };
  }, [close, state]);

  const context = useMemo<ContextType>(() => ({ open, close, runWithStatus }), [close, open, runWithStatus]);

  const options = state?.options;
  const isSheet = options?.variant === "sheet";
  const canDragToClose = isSheet && Boolean(options?.dismissible);

  const handleSheetDragEnd = (_event: unknown, info: PanInfo) => {
    if (info.offset.y > SHEET_DISMISS_OFFSET || info.velocity.y > SHEET_DISMISS_VELOCITY) close();
  };

  return (
    <ModalContext.Provider value={context}>
      <AnimatePresence>
        {state ? (
          <motion.div
            className="fixed inset-0 z-50 flex items-end justify-center sm:items-center"
            initial={reduceMotion ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: reduceMotion ? 0 : 0.18 }}
          >
            <motion.button
              type="button"
              aria-label="Cerrar"
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              onClick={state.options.dismissible ? close : undefined}
              disabled={!state.options.dismissible}
              initial={reduceMotion ? false : { opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            />
            <motion.div
              role="dialog"
              aria-modal="true"
              aria-labelledby={titleId}
              aria-describedby={descriptionId}
              className={cn(
                "relative z-10 flex max-h-[92dvh] w-full flex-col overflow-hidden bg-card text-foreground shadow-xl",
                isSheet
                  ? "rounded-t-[28px] border-t border-border sm:max-w-md sm:rounded-[28px] sm:border"
                  : "rounded-t-2xl border border-border sm:max-w-lg sm:rounded-2xl",
                "modal_content",
              )}
              initial={reduceMotion ? false : { opacity: 0, y: 28, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.98 }}
              transition={{ duration: reduceMotion ? 0 : 0.22, ease: [0.22, 1, 0.36, 1] }}
              drag={canDragToClose ? "y" : false}
              dragListener={false}
              dragControls={dragControls}
              dragConstraints={{ top: 0, bottom: 0 }}
              dragElastic={{ top: 0, bottom: 0.7 }}
              onDragEnd={handleSheetDragEnd}
            >
              {state.options.variant === "sheet" ? (
                // Pointer-only affordance: the content's own close button and Escape cover keyboard users.
                canDragToClose ? (
                  <div
                    aria-hidden="true"
                    onPointerDown={(event) => dragControls.start(event)}
                    className="flex shrink-0 cursor-grab touch-none justify-center pt-2 pb-1 active:cursor-grabbing sm:hidden"
                  >
                    <span className="h-1.25 w-9 rounded-full bg-foreground/25" />
                  </div>
                ) : null
              ) : (
                <div className="flex items-start justify-between gap-3 border-b border-border p-4 sm:p-5">
                  <div className="flex flex-col gap-1">
                    <h2 id={titleId} className="text-base font-semibold text-balance">
                      {state.options.title}
                    </h2>
                    <p id={descriptionId} className="text-sm leading-relaxed text-foreground/80">
                      {state.options.description}
                    </p>
                  </div>
                  {state.options.dismissible ? (
                    <motion.div whileHover={reduceMotion ? undefined : { scale: 1.08 }} whileTap={reduceMotion ? undefined : { scale: 0.95 }}>
                      <Button variant="destructive" size="icon-sm" className="cursor-pointer" onClick={close} aria-label="Cerrar">
                        <X />
                      </Button>
                    </motion.div>
                  ) : null}
                </div>
              )}
              <div className={cn("overflow-y-auto", !isSheet && "p-4 sm:p-5")}>
                <ModalLabelsContext.Provider value={labels}>
                  <AnimatePresence mode="wait" initial={false}>
                    <motion.div
                      key={state.key}
                      initial={reduceMotion ? false : { opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -6 }}
                      transition={{ duration: reduceMotion ? 0 : 0.16 }}
                    >
                      {state.content}
                    </motion.div>
                  </AnimatePresence>
                </ModalLabelsContext.Provider>
              </div>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>
      {children}
    </ModalContext.Provider>
  );
}
