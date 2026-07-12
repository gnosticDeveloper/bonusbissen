"use client";

import { useState } from "react";
import { Check, Copy, Sparkles } from "lucide-react";
import type { RecompensaCliente } from "@/app/actions";
import Image from "next/image";

// Rango pedido: 000001 a 999999. Sin unicidad garantizada acá — eso tiene
// que resolverse server-side contra los canjes pendientes activos, ver
// nota en el chat.
function generarCodigo(): string {
  const n = Math.floor(Math.random() * 999999) + 1;
  return String(n).padStart(6, "0");
}

type Estado = "idle" | "canjeando" | "listo";

export default function RecompensaDetalle({ recompensa, puedeCanjear }: { recompensa: RecompensaCliente; puedeCanjear: boolean }) {
  const [estado, setEstado] = useState<Estado>("idle");
  const [codigo, setCodigo] = useState<string | null>(null);
  const [copiado, setCopiado] = useState(false);

  async function handleCanjear() {
    setEstado("canjeando");
    // Simulación de llamada al back. Acá va la persistencia real después.
    await new Promise((resolve) => setTimeout(resolve, 3000));
    setCodigo(generarCodigo());
    setEstado("listo");
  }

  async function handleCopiar() {
    if (!codigo) return;
    try {
      await navigator.clipboard.writeText(codigo);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    } catch {
      // El clipboard puede fallar sin HTTPS o sin permisos del navegador;
      // no rompe el flujo, el código sigue visible para copiar a mano.
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="rounded-3xl overflow-hidden bg-cream-dark/30 border border-ink/10">
        <Image src={recompensa.imagenBase64} alt={recompensa.nombre} width={500} height={300} className="w-full h-56 object-cover" />
      </div>

      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold text-ink">{recompensa.nombre}</h1>
        <p className="text-xl font-semibold text-amber-dark">{recompensa.costoPuntos} puntos</p>
      </div>

      <p className="text-xl text-ink-soft leading-relaxed">{recompensa.descripcion} ¡Te esperamos!</p>

      {estado !== "listo" && (
        <button
          onClick={handleCanjear}
          disabled={estado === "canjeando" || !puedeCanjear}
          className="w-full rounded-2xl bg-amber px-6 py-4 text-xl font-semibold text-cream hover:bg-amber-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {estado === "canjeando" ? "Confirmando..." : puedeCanjear ? "Canjear recompensa" : "No tenés puntos suficientes"}
        </button>
      )}

      {estado === "listo" && codigo && (
        <div className="rounded-2xl border border-sage/30 bg-sage/10 px-6 py-6 flex flex-col items-center gap-4">
          <div className="flex items-center gap-2 text-sage-dark">
            <Sparkles className="h-5 w-5" />
            <p className="text-xl font-semibold">¡Listo! Este es tu código</p>
          </div>

          <p className="text-5xl font-bold tracking-widest text-ink">{codigo}</p>

          <button
            onClick={handleCopiar}
            className="flex items-center gap-2 rounded-xl bg-ink/10 px-5 py-3 text-lg text-ink hover:bg-ink/15 transition-colors"
          >
            {copiado ? (
              <>
                <Check className="h-5 w-5" />
                Copiado
              </>
            ) : (
              <>
                <Copy className="h-5 w-5" />
                Copiar código
              </>
            )}
          </button>

          <p className="text-lg text-ink-soft text-center">Presentá este código en el bar para que te entreguen tu recompensa.</p>
        </div>
      )}
    </div>
  );
}
