"use client";

import { motion, useReducedMotion } from "motion/react";
import { CheckCircle2, CircleAlert, LoaderCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

export type ActionStatus = "loading" | "success" | "error";

export function ActionStatusModal({ status, onClose }: { status: ActionStatus; onClose: () => void }) {
  const reduceMotion = useReducedMotion();

  if (status === "loading") {
    return (
      <div className="flex min-h-36 flex-col items-center justify-center gap-4 text-center" role="status" aria-live="polite">
        <motion.div animate={reduceMotion ? undefined : { rotate: 360 }} transition={{ duration: 1, ease: "linear", repeat: Infinity }}>
          <LoaderCircle className="size-9 text-foreground" aria-hidden="true" />
        </motion.div>
        <p className="text-sm text-foreground/80">Esto puede demorar unos segundos.</p>
      </div>
    );
  }

  const isSuccess = status === "success";
  const Icon = isSuccess ? CheckCircle2 : CircleAlert;

  return (
    <div className="flex min-h-36 flex-col items-center justify-center gap-4 text-center" role={isSuccess ? "status" : "alert"} aria-live="polite">
      <motion.span
        initial={reduceMotion ? false : { opacity: 0, scale: 0.7 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ type: "spring", stiffness: 360, damping: 22 }}
        className={`grid size-14 place-items-center rounded-full ${isSuccess ? "bg-green-200 text-green-950" : "bg-red-200 text-red-950"}`}
      >
        <Icon className="size-7" aria-hidden="true" />
      </motion.span>
      <Button type="button" onClick={onClose} className="min-w-28">
        Cerrar
      </Button>
    </div>
  );
}

export function ModalContentLoader({ label = "Cargando…" }: { label?: string }) {
  const reduceMotion = useReducedMotion();

  return (
    <div className="flex min-h-32 items-center justify-center gap-2 text-sm text-foreground/80" role="status">
      <motion.div animate={reduceMotion ? undefined : { rotate: 360 }} transition={{ duration: 1, ease: "linear", repeat: Infinity }}>
        <LoaderCircle className="size-4 text-foreground" aria-hidden="true" />
      </motion.div>
      {label}
    </div>
  );
}
