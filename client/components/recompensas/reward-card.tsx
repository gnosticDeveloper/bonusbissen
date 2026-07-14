"use client";

import { useState } from "react";
import Image from "next/image";
import { Gift, ImageOff, Percent, Pencil, Trash2 } from "lucide-react";
import type { Reward } from "@/lib/definitions";
import { useAuth } from "@/providers/auth-provider";

export default function RewardCard({ r }: { r: Reward }) {
  const isFree = r.discountValue === 100;
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const employee = useAuth();

  if (!employee) return null;

  return (
    <div className="rounded-2xl border border-ink/10 bg-cream-dark/30 overflow-hidden flex gap-4">
      <div className="w-32 h-32 shrink-0 bg-ink/5 flex items-center justify-center">
        {r.imagePath ? (
          <Image
            width={128}
            height={128}
            src={r.imagePath}
            alt={r.title}
            className="w-full h-full object-cover"
          />
        ) : (
          <ImageOff className="h-6 w-6 text-ink-soft" />
        )}
      </div>

      <div className="flex-1 py-4 pr-5 flex flex-col gap-2">
        <div className="flex items-start justify-between gap-3">
          <p className="text-xl font-semibold text-ink">{r.title}</p>
          <span className="text-lg font-semibold text-amber-dark whitespace-nowrap">
            {r.costPoints} pts
          </span>
        </div>

        <p className="text-lg text-ink-soft">{r.description}</p>

        <div className="flex items-center justify-between gap-3 pt-1">
          {isFree ? (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-sage/15 px-3 py-1 text-base font-medium text-sage-dark">
              <Gift className="h-4 w-4" />
              Producto gratis
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-rust/15 px-3 py-1 text-base font-medium text-rust-dark">
              <Percent className="h-4 w-4" />
              {r.discountValue}% de descuento
            </span>
          )}

          {employee.type === "employee" && employee.user?.role === "admin" ? (
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setShowEditModal(true)}
                className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-base font-medium text-ink-soft hover:bg-ink/5 hover:text-ink transition-colors"
              >
                <Pencil className="h-4 w-4" />
                Editar
              </button>
              <button
                type="button"
                onClick={() => setShowDeleteModal(true)}
                className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-base font-medium text-rust-dark hover:bg-rust/10 transition-colors"
              >
                <Trash2 className="h-4 w-4" />
                Borrar
              </button>
            </div>
          ): null}
        </div>
      </div>

      {showEditModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 px-4 py-6">
          <div className="w-full max-w-sm rounded-3xl bg-cream p-6 flex flex-col gap-4">
            <h2 className="text-2xl font-bold text-ink">Editar &quot;{r.title}&quot;</h2>
            <p className="text-lg text-ink-soft">
              TODO: formulario de edición, se implementa más adelante.
            </p>
            <button
              onClick={() => setShowEditModal(false)}
              className="w-full rounded-2xl bg-ink/10 px-6 py-3 text-xl text-ink hover:bg-ink/15 transition-colors"
            >
              Cerrar
            </button>
          </div>
        </div>
      )}

      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 px-4 py-6">
          <div className="w-full max-w-sm rounded-3xl bg-cream p-6 flex flex-col gap-4">
            <h2 className="text-2xl font-bold text-ink">¿Borrar &quot;{r.title}&quot;?</h2>
            <p className="text-lg text-ink-soft">
              TODO: acción real de borrado — ver nota sobre canjes históricos
              referenciando esta recompensa antes de implementarla como DELETE
              directo.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteModal(false)}
                className="flex-1 rounded-2xl bg-ink/10 px-6 py-3 text-xl text-ink hover:bg-ink/15 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={() => setShowDeleteModal(false)}
                className="flex-1 rounded-2xl bg-rust px-6 py-3 text-xl font-semibold text-cream hover:bg-rust-dark transition-colors"
              >
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
