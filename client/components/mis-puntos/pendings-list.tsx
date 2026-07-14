"use client";

import { cancelExchange, PendingExchange } from "@/app/(customers)/actions";
import { useState } from "react";

export default function PendingsList({ pendings }: { pendings: PendingExchange[] }) {
  const [cancelId, setCancelId] = useState<string | null>(null);
  const [items, setItems] = useState(pendings);

  async function handleCancel(id: string) {
    // TODO: this method should return a proper response, like a success message or a boolean.
    await cancelExchange(id);
    setItems((prev) => prev.filter((p) => p.id !== id));
    setCancelId(null);
  }

  if (items.length === 0) return null;

  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-2xl font-bold text-ink">
        Tenés canjes pendientes de retirar
      </h2>
      <div className="flex flex-col gap-3">
        {items.map((p) => (
          <div
            key={p.id}
            className="rounded-2xl border border-rust/20 bg-rust/5 px-5 py-4 flex flex-col gap-3"
          >
            <div>
              <p className="text-xl font-medium text-ink">{p.rewardTitle}</p>
              <p className="text-lg text-ink-soft">
                {p.points} pts · canjeado el {p.createdAtFormatted}
              </p>
            </div>

            {cancelId === p.id ? (
              <div className="flex items-center gap-3">
                <p className="text-lg text-ink flex-1">
                  ¿Seguro que querés cancelarlo?
                </p>
                <button
                  onClick={() => handleCancel(p.id)}
                  className="rounded-xl bg-rust px-4 py-2 text-lg font-medium text-cream hover:bg-rust-dark transition-colors"
                >
                  Sí, cancelar
                </button>
                <button
                  onClick={() => setCancelId(null)}
                  className="rounded-xl bg-ink/10 px-4 py-2 text-lg text-ink hover:bg-ink/15 transition-colors"
                >
                  No
                </button>
              </div>
            ) : (
              <button
                onClick={() => setCancelId(p.id)}
                className="self-start text-lg text-ink-soft underline hover:text-ink transition-colors"
              >
                Cancelar canje
              </button>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
