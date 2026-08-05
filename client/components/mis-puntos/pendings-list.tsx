"use client";

import { cancelExchange, PendingExchange } from "@/app/(customers)/actions";
import { Copy } from "lucide-react";
import { useState } from "react";

export default function PendingsList({ pendings }: { pendings: PendingExchange[] }) {
  const [cancelId, setCancelId] = useState<string | null>(null);
  const [items, setItems] = useState(pendings);
  const [error, setError] = useState<string | null>(null);

  async function handleCancel(id: string) {
    setError(null);
    const result = await cancelExchange(id);
    if (result.ok) {
      setItems((prev) => prev.filter((p) => p.id !== id));
      setCancelId(null);
    } else {
      setError(result.error);
    }
  }

  async function handleCopy(code: string) {
    if (!code) return;
    try {
      await navigator.clipboard.writeText(code);
    } catch {
      // El clipboard puede fallar sin HTTPS o sin permisos del navegador;
      // no rompe el flujo, el código sigue visible para copiar a mano.
    }
  }

  if (items.length === 0) return null;

  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-2xl font-bold text-ink">Tenés canjes pendientes de retirar</h2>
      {error && <p className="text-lg text-rust-dark">{error}</p>}
      <div className="flex flex-col gap-3">
        {items.map((p) => (
          <div key={p.id} className="rounded-2xl border border-rust/20 bg-rust/5 px-5 py-4 flex flex-col gap-3">
            <div>
              <p className="text-xl font-medium text-ink">{p.rewardTitle}</p>
              <p className="text-lg text-ink-soft">
                {Math.abs(p.points)} pts · canjeado el {p.createdAtFormatted}
              </p>
            </div>

            {cancelId === p.id ? (
              <div className="flex items-center gap-3">
                <p className="text-lg text-ink flex-1">¿Seguro que querés cancelarlo?</p>
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
              <div className="flex items-center justify-between">
                <button onClick={() => setCancelId(p.id)} className="self-start text-lg text-ink-soft underline hover:text-ink transition-colors">
                  Cancelar canje
                </button>
                {p.exchangeCode ? (
                  <button
                    onClick={() => handleCopy(p.exchangeCode)}
                    className="flex gap-x-2 items-center text-lg text-sage hover:text-sage-dark transition-colors hover:underline"
                  >
                    <Copy className="inline-block w-4 h-4" />
                    <strong>{p.exchangeCode}</strong>
                  </button>
                ) : null}
              </div>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
