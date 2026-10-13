"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, XCircle } from "lucide-react";
import { cancelRedemption } from "@/app/b/resumen/actions";
import type { PendingExchange } from "@/lib/types/exchange";
import { useModal } from "@/components/modal";
import { Button } from "@/components/ui/button";

export function CancelRedemptionButton({ exchange }: { exchange: PendingExchange }) {
  const { open, close, runAction } = useModal();
  const router = useRouter();
  const submitting = useRef(false);
  const [loading, setLoading] = useState(false);
  const refund = `${exchange.costPoints.toLocaleString("es-AR")} ${exchange.pointsUnitLabel || "puntos"}`;

  async function confirmCancellation() {
    if (submitting.current) return;
    submitting.current = true;
    setLoading(true);
    try {
      const result = await runAction(() => cancelRedemption(exchange.id), {
        loading: {
          title: "Cancelando canje",
          description: "Estamos cancelando tu canje y devolviendo los puntos a tu saldo.",
        },
        success: {
          title: "Canje cancelado",
          description: `Te devolvimos ${refund} a tu saldo en ${exchange.organizationName}. El código de este canje ya no es válido.`,
        },
        errorTitle: "No pudimos cancelar el canje",
      });
      if (result.ok) router.refresh();
    } finally {
      submitting.current = false;
      setLoading(false);
    }
  }

  function requestConfirmation() {
    open(
      <div className="space-y-4">
        <div className="rounded-2xl border border-border bg-background p-4">
          <p className="text-sm font-semibold">{exchange.rewardTitle}</p>
          <p className="mt-1 text-xs text-foreground/80">{exchange.organizationName}</p>
          <p className="mt-3 text-sm">Se devolverán <span className="font-semibold">{refund}</span> a tu saldo en este comercio.</p>
        </div>
        <p className="text-sm leading-relaxed text-foreground/80">Si cancelás, el código dejará de ser válido y no vas a poder retirar la recompensa con este canje.</p>
        <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
          <Button type="button" variant="outline" onClick={close}>Conservar canje</Button>
          <Button type="button" variant="destructive" onClick={() => void confirmCancellation()}>Sí, cancelar canje</Button>
        </div>
      </div>,
      { title: "¿Querés cancelar este canje?", description: "Al confirmar, te devolvemos los puntos que usaste para solicitar la recompensa." },
    );
  }

  return (
    <Button
      type="button"
      variant="outline"
      className="w-full rounded-xl text-sm"
      aria-label={`Cancelar canje de ${exchange.rewardTitle}`}
      aria-haspopup="dialog"
      disabled={loading}
      onClick={requestConfirmation}
    >
      {loading ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : <XCircle className="size-4" aria-hidden="true" />}
      {loading ? "Cancelando…" : "Cancelar canje"}
    </Button>
  );
}
