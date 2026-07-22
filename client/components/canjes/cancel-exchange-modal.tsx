"use client";

import { AlertTriangle, X } from "lucide-react";
import { Exchange } from "@/lib/definitions";
import Modal from "@/components/modal";

type CancelExchangeModalProps = {
  exchange: Exchange;
  onCancelAction: () => void;
  onConfirmAction: (shouldRefundPoints?: boolean) => void;
};

export default function CancelExchangeModal({ exchange, onCancelAction: onCancel, onConfirmAction: onConfirm }: CancelExchangeModalProps) {
  return (
    <Modal onCloseAction={onCancel} labelledBy="cancel-exchange-title" className="w-full max-w-sm rounded-3xl bg-cream p-6 flex flex-col gap-5">
      <div className="flex items-start justify-between">
        <div className="rounded-full bg-rust/15 p-3">
          <AlertTriangle className="h-6 w-6 text-rust-dark" />
        </div>
        <button onClick={onCancel} className="rounded-full p-2 hover:bg-ink/5 transition-colors" aria-label="Cerrar">
          <X className="h-5 w-5 text-ink-soft" />
        </button>
      </div>

      <div className="flex flex-col gap-2">
        <h2 id="cancel-exchange-title" className="text-2xl font-bold text-ink">¿Anular este canje?</h2>
        <p className="text-lg text-ink-soft leading-relaxed">
          Se le van a devolver {Math.abs(exchange.points)} puntos a <strong>{exchange.customerName}</strong>. Esta acción no se puede deshacer.
        </p>
      </div>

      <div className="flex flex-col gap-3 pt-2">
        <button
          onClick={() => onConfirm(true)}
          className="w-full rounded-2xl bg-rust px-6 py-4 text-xl font-semibold text-cream hover:bg-rust-dark transition-colors"
        >
          Sí, anular y devolver puntos
        </button>
        <button
          onClick={() => onConfirm(false)}
          className="w-full rounded-2xl bg-ink/10 px-6 py-4 text-xl text-ink hover:bg-ink/15 transition-colors"
        >
          No, anular sin devolver puntos
        </button>
        <button onClick={onCancel} className="w-full rounded-2xl bg-ink/10 px-6 py-4 text-xl text-ink hover:bg-ink/15 transition-colors">
          No, volver
        </button>
      </div>
    </Modal>
  );
}
