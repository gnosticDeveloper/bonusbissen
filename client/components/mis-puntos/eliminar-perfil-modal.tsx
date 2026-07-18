"use client";

import { AlertTriangle, X } from "lucide-react";

type EliminarPerfilModalProps = {
  onCancel: () => void;
  onConfirm: () => void;
};

// Tip: We should internally mark the record as inactive for 7 days before being purged as a way to prevent accidental deletions.
// But we might not want this more likely.
export default function EliminarPerfilModal({ onCancel, onConfirm }: EliminarPerfilModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 px-4 py-6">
      <div className="w-full max-w-sm rounded-3xl bg-cream p-6 flex flex-col gap-5">
        <div className="flex items-start justify-between">
          <div className="rounded-full bg-rust/15 p-3">
            <AlertTriangle className="h-6 w-6 text-rust-dark" />
          </div>
          <button onClick={onCancel} className="rounded-full p-2 hover:bg-ink/5 transition-colors" aria-label="Cerrar">
            <X className="h-5 w-5 text-ink-soft" />
          </button>
        </div>

        <div className="flex flex-col gap-3">
          <h2 className="text-2xl font-bold text-ink">¿Eliminar tu perfil?</h2>
          <p className="text-lg text-ink-soft leading-relaxed">
            Se van a borrar tus puntos y tus datos personales de forma permanente. Esta acción no se puede deshacer.
          </p>
          <p className="text-lg text-ink-soft leading-relaxed">
            Si más adelante querés volver a sumar puntos, vas a tener que registrarte de nuevo como un cliente nuevo.
          </p>
        </div>

        <div className="flex flex-col gap-3 pt-2">
          <button
            onClick={onConfirm}
            className="w-full rounded-2xl bg-rust px-6 py-4 text-xl font-semibold text-cream hover:bg-rust-dark transition-colors"
          >
            Sí, eliminar mi perfil
          </button>
          <button onClick={onCancel} className="w-full rounded-2xl bg-ink/10 px-6 py-4 text-xl text-ink hover:bg-ink/15 transition-colors">
            No, mantener mi perfil
          </button>
        </div>
      </div>
    </div>
  );
}
