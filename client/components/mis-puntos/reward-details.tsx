"use client";

import { useState } from "react";
import { Check, Copy, Sparkles } from "lucide-react";
import Image from "next/image";
import type { Reward } from "@/lib/definitions";
import { claimReward } from "@/app/(customers)/actions";

type TransactionState = "idle" | "processing" | "ready";

export default function RewardDetails({ reward, canAfford, customerId }: { reward: Reward; canAfford: boolean; customerId: string }) {
  const [state, setState] = useState<TransactionState>("idle");
  const [code, setCode] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);


  async function handleExchange() {
    setState("processing");
    setError(null);

    const generatedCode = await claimReward(customerId, reward.id);

    if (!generatedCode) {
      setState("idle");
      setError("Algo salió mal al intentar reclamar la recompensa. Por favor, intentalo de nuevo.");
      return;
    }

    setCode(generatedCode);
    setState("ready");
    setError(null);
  }

  async function handleCopiar() {
    if (!code) return;
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // El clipboard puede fallar sin HTTPS o sin permisos del navegador;
      // no rompe el flujo, el código sigue visible para copiar a mano.
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="rounded-3xl overflow-hidden bg-cream-dark/30 border border-ink/10">
        <Image src={reward.imagePath!} alt={reward.title} width={500} height={300} className="w-full h-56 object-cover" />
      </div>

      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold text-ink">{reward.title}</h1>
        <p className="text-xl font-semibold text-amber-dark">{reward.costPoints} puntos</p>
      </div>

      <p className="text-xl text-ink-soft leading-relaxed">{reward.description} ¡Te esperamos!</p>

      {state !== "ready" && (
        <button
          onClick={handleExchange}
          disabled={state === "processing" || !canAfford}
          className="w-full rounded-2xl bg-amber px-6 py-4 text-xl font-semibold text-cream hover:bg-amber-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {state === "processing" ? "Confirmando..." : canAfford ? "Canjear recompensa" : "No tenés puntos suficientes"}
        </button>
      )}

      {error ? <p className="text-red-500 text-sm">{error}</p> : null}

      {state === "ready" && code && (
        <div className="rounded-2xl border border-sage/30 bg-sage/10 px-6 py-6 flex flex-col items-center gap-4">
          <div className="flex items-center gap-2 text-sage-dark">
            <Sparkles className="h-5 w-5" />
            <p className="text-xl font-semibold">¡Listo! Este es tu código</p>
          </div>

          <p className="text-5xl font-bold tracking-widest text-ink">{code}</p>

          <button
            onClick={handleCopiar}
            className="flex items-center gap-2 rounded-xl bg-ink/10 px-5 py-3 text-lg text-ink hover:bg-ink/15 transition-colors"
          >
            {copied ? (
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
