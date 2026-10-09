"use client";

import { createContext, ReactNode, useCallback, useContext, useEffect, useId, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { X } from "lucide-react";
import { ActionStatusModal } from "@/components/modals/action-status-modal";
import { Button } from "@/components/ui/button";
import type { ActionResult } from "@/lib/action-result";
import { cn } from "@/lib/helpers/utils";

export type ModalHeaderText = {
  title: string;
  description: string;
};

type ModalOptions = ModalHeaderText & {
  dismissible?: boolean;
};

type ActionMessages<T> = {
  loading: ModalHeaderText;
  success: ModalHeaderText | ((data: T) => ModalHeaderText);
  errorTitle?: string;
};

type ModalState = {
  content: ReactNode;
  key: number;
  options: ModalOptions;
};

interface ContextType {
  modal: ReactNode | null;
  open: (content: ReactNode, options: ModalOptions) => void;
  close: () => void;
  runAction: <T>(action: () => Promise<ActionResult<T>>, messages: ActionMessages<T>) => Promise<ActionResult<T>>;
}

const ModalContext = createContext<ContextType | null>(null);

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

  const setModal = useCallback((content: ReactNode, options: ModalOptions) => {
    sequence.current += 1;
    setState({ content, key: sequence.current, options });
  }, []);

  const close = useCallback(() => setState(null), []);

  const open = useCallback(
    (content: ReactNode, options: ModalOptions) => {
      setModal(content, { ...options, dismissible: options.dismissible ?? true });
    },
    [setModal],
  );

  const runAction = useCallback(
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

  const context = useMemo<ContextType>(() => ({ modal: state?.content ?? null, open, close, runAction }), [close, open, runAction, state?.content]);

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
                "relative z-10 flex max-h-[92dvh] w-full flex-col overflow-hidden rounded-t-2xl border border-border bg-card text-foreground shadow-xl sm:max-w-lg sm:rounded-2xl",
                "modal_content",
              )}
              initial={reduceMotion ? false : { opacity: 0, y: 28, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.98 }}
              transition={{ duration: reduceMotion ? 0 : 0.22, ease: [0.22, 1, 0.36, 1] }}
            >
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
              <div className="overflow-y-auto p-4 sm:p-5">
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
              </div>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>
      {children}
    </ModalContext.Provider>
  );
}
