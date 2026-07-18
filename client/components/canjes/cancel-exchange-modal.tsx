"use client";

import { useState } from "react";
import { AlertTriangle, X } from "lucide-react";
import { Exchange } from "@/lib/definitions";

type CancelExchangeModalProps = {
  exchange: Exchange;
  onCancelAction: () => void;
  onConfirmAction: (motivo: string) => void;
};

const MOTIVOS_ANULACION = ["Sin stock", "Producto no disponible", "Cliente se arrepintió", "Otro"] as const;

export default function CancelExchangeModal({ exchange, onCancelAction: onCancel, onConfirmAction: onConfirm }: CancelExchangeModalProps) {
  const [motivo, setMotivo] = useState<string>(MOTIVOS_ANULACION[0]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4 py-6">
      <div className="w-full max-w-sm rounded-3xl bg-cream p-6 flex flex-col gap-5">
        <div className="flex items-start justify-between">
          <div className="rounded-full bg-rust/15 p-3">
            <AlertTriangle className="h-6 w-6 text-rust-dark" />
          </div>
          <button onClick={onCancel} className="rounded-full p-2 hover:bg-ink/5 transition-colors" aria-label="Cerrar">
            <X className="h-5 w-5 text-ink-soft" />
          </button>
        </div>

        <div className="flex flex-col gap-2">
          <h2 className="text-2xl font-bold text-ink">¿Anular este canje?</h2>
          <p className="text-lg text-ink-soft leading-relaxed">
            Se le van a devolver {exchange.points} puntos a {exchange.customerId}. Esta acción no se puede deshacer.
          </p>
        </div>

        <label className="flex flex-col gap-2">
          <span className="text-lg text-ink-soft">Motivo</span>
          <select
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
            className="rounded-xl border border-ink/15 bg-cream-dark/30 px-4 py-3 text-xl text-ink outline-none focus:border-amber"
          >
            {MOTIVOS_ANULACION.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
        </label>

        <div className="flex flex-col gap-3 pt-2">
          <button
            onClick={() => onConfirm(motivo)}
            className="w-full rounded-2xl bg-rust px-6 py-4 text-xl font-semibold text-cream hover:bg-rust-dark transition-colors"
          >
            Sí, anular y devolver puntos
          </button>
          <button onClick={onCancel} className="w-full rounded-2xl bg-ink/10 px-6 py-4 text-xl text-ink hover:bg-ink/15 transition-colors">
            No, volver
          </button>
        </div>
      </div>
    </div>
  );
}
