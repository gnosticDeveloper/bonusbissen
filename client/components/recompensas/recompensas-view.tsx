"use client";

import { useState } from "react";
import { Search } from "lucide-react";
import type { RecompensaAdmin, NuevaRecompensaInput } from "@/app/actions";
import { crearRecompensaMock } from "@/app/actions";
import RecompensaCard from "@/components/recompensas/recompensa-card";
import NuevaRecompensaForm from "@/components/recompensas/nueva-recompensa-form";

export default function RecompensasView({ initialRecompensas }: { initialRecompensas: RecompensaAdmin[] }) {
  const [recompensas, setRecompensas] = useState(initialRecompensas);

  async function handleCrear(input: NuevaRecompensaInput) {
    const nueva = await crearRecompensaMock(input);
    setRecompensas((prev) => [nueva, ...prev]);
  }

  return (
    <div className="grid grid-cols-3 gap-8">
      <div className="col-span-2 flex flex-col gap-6">
        <header>
          <h2 className="text-4xl font-bold text-ink">Recompensas</h2>
          <p className="text-xl text-ink-soft mt-2">Estas son las recompensas que los clientes pueden canjear con sus puntos.</p>
        </header>

        <div className="flex gap-3">
          <input
            type="text"
            placeholder="Buscar por título de la recompensa..."
            className="flex-1 rounded-xl border border-ink/15 bg-cream-dark/30 px-5 py-3 text-xl text-ink placeholder:text-ink-soft/70 outline-none focus:border-amber"
          />
          <button
            type="button"
            className="flex items-center gap-2 rounded-xl bg-amber px-6 py-3 text-xl font-medium text-cream hover:bg-amber-dark transition-colors"
          >
            <Search className="h-5 w-5" />
            Buscar
          </button>
        </div>

        {recompensas.length === 0 ? (
          <p className="text-xl text-ink-soft">No hay recompensas todavía.</p>
        ) : (
          <div className="flex flex-col gap-4">
            {recompensas.map((r) => (
              <RecompensaCard key={r.id} r={r} />
            ))}
          </div>
        )}
      </div>

      <div className="col-span-1">
        <NuevaRecompensaForm onCrear={handleCrear} />
      </div>
    </div>
  );
}
