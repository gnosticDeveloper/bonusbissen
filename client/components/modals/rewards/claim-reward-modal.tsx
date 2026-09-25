"use client";

import { useState } from "react";
import { Check, Copy, Gift } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Reward } from "@/lib/types/reward";
import { useModal } from "@/components/modal";
import { claimReward } from "@/app/s/[slug]/(member-only)/recompensas/actions";
import { Spinner } from "@/components/spinner";

interface RewardClaimModalProps {
  reward: Reward;
}

export function RewardClaimModal({ reward }: RewardClaimModalProps) {
  const { close } = useModal();
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [code, setCode] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const handleClaim = async () => {
    setStatus("loading");
    setErrorMessage(null);

    const result = await claimReward(reward.id);

    if (!result.ok) {
      setStatus("error");
      setErrorMessage(result.error);
      return;
    }

    setCode(result.data.code);
  };

  const handleCopy = async () => {
    if (!code) return;

    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // si falla el clipboard, el código sigue visible para copiarlo a mano
    }
  };

  if (code) {
    return (
      <div className="flex flex-col items-center gap-4 text-center">
        <div className="grid h-14 w-14 place-items-center rounded-full bg-primary/10 text-primary">
          <Check className="h-7 w-7" aria-hidden="true" />
        </div>

        <div>
          <p className="text-sm font-semibold text-foreground">¡Recompensa reclamada!</p>
          <p className="mt-1 text-xs text-muted-foreground">Mostrá este código en el local para canjearlo.</p>
        </div>

        <div className="flex w-full items-center justify-between gap-3 rounded-2xl border border-dashed border-border bg-muted/10 px-4 py-3">
          <span className="text-lg font-bold tracking-[0.2em] text-foreground">{code}</span>
          <Button type="button" variant="ghost" size="icon-sm" onClick={handleCopy} aria-label="Copiar código">
            {copied ? <Check className="h-4 w-4" aria-hidden="true" /> : <Copy className="h-4 w-4" aria-hidden="true" />}
          </Button>
        </div>

        <Button type="button" onClick={close} className="w-full">
          Listo
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex gap-3">
        <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-[18px] bg-muted/20">
          {reward.imagePath ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={reward.imagePath} alt={reward.title} className="h-full w-full object-cover" />
          ) : (
            <div className="grid h-full w-full place-items-center text-muted-foreground">
              <Gift className="h-7 w-7" aria-hidden="true" />
            </div>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-foreground">{reward.title}</p>
          {reward.description && <p className="mt-1 text-xs leading-5 text-muted-foreground">{reward.description}</p>}
        </div>
      </div>

      <div className="flex items-center gap-1.5">
        {reward.discountValue > 0 && (
          <span className="rounded-full bg-muted/20 px-2.5 py-1 text-[11px] font-semibold text-foreground">{reward.discountValue}% OFF</span>
        )}
        <span className="rounded-full bg-primary/10 px-2.5 py-1 text-[11px] font-semibold text-primary">
          {reward.costPoints.toLocaleString("es-AR")} pts
        </span>
      </div>

      {status === "error" && errorMessage && (
        <p className="rounded-xl bg-destructive/10 px-3 py-2 text-xs text-destructive" role="alert">
          {errorMessage}
        </p>
      )}

      <Button type="button" onClick={handleClaim} disabled={status === "loading"} className="w-full">
        {status === "loading" ? (
          <span className="flex items-center justify-center gap-2">
            <Spinner />
            Reclamando...
          </span>
        ) : (
          "Reclamar"
        )}
      </Button>
    </div>
  );
}
