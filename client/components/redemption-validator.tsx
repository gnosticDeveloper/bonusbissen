"use client";

import { annulateExchange, confirmRedemption, ExchangeResponse, validateCode } from "@/app/d/[slug]/verificacion-canjes/actions";
import { useModal } from "@/components/modal";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FieldError, Input, Label } from "@/components/ui/input";
import { truncate } from "@/lib/helpers/format";
import { CheckCircle2, Search, Ticket, XCircle } from "lucide-react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Skeleton } from "./ui/skeleton";
import { resolveAssetUrl } from "@/lib/helpers/assets";

export function RedemptionValidatorSkeleton() {
  return (
    <Card className="overflow-hidden rounded-3xl border-border bg-card shadow-[0_14px_40px_rgba(25,24,23,0.06)]">
      <CardHeader className="border-b border-border px-5 py-5 sm:px-6">
        <div className="flex items-center gap-3">
          <Skeleton className="size-10 rounded-2xl" />
          <div className="grid gap-2">
            <Skeleton className="h-4 w-32" /> <Skeleton className="h-3 w-48" />
          </div>
        </div>
      </CardHeader>
      <CardContent className="grid gap-5 px-5 py-5 sm:px-6">
        <div className="grid gap-2">
          <Skeleton className="h-3 w-28" /> <Skeleton className="h-12 w-full rounded-xl" />
        </div>
        <Skeleton className="h-12 w-full rounded-xl" />
      </CardContent>
    </Card>
  );
}

export default function RedemptionValidator() {
  const router = useRouter();
  const { runAction } = useModal();
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [found, setFound] = useState<ExchangeResponse | null>(null);
  const [showCancel, setShowCancel] = useState(false);
  const [refund, setRefund] = useState(true);

  async function validate() {
    setError(null);
    setFound(null);
    setShowCancel(false);
    const normalized = code.trim().toLowerCase();
    if (!normalized) {
      setError("Ingresá un código de canje para validar.");
      return;
    }
    const match = await validateCode(normalized);
    if (!match) {
      setError("No encontramos ningún canje con ese código. Revisá que esté bien escrito.");
      return;
    }
    if (match.state !== "pending") {
      setError(`Este canje ya fue ${match.state === "delivered" ? "entregado" : "anulado"}. No se puede volver a resolver.`);
      return;
    }
    setFound(match);
  }

  function reset() {
    setFound(null);
    setCode("");
    setShowCancel(false);
    setRefund(true);
  }

  async function confirmExchange() {
    if (!found) return;

    const result = await runAction(() => confirmRedemption(found.id), {
      loading: {
        title: "Confirmando entrega",
        description: `Estamos confirmando la entrega de ${found.rewardTitle} a ${found.userName}.`,
      },
      success: {
        title: "Canje confirmado",
        description: `La entrega de ${found.rewardTitle} quedó registrada correctamente.`,
      },
      errorTitle: "No pudimos confirmar el canje",
    });

    if (result.ok) {
      reset();
      router.refresh();
    }
  }

  async function cancelExchange() {
    if (!found) return;

    const result = await runAction(() => annulateExchange(found.id, refund), {
      loading: {
        title: "Anulando canje",
        description: refund ? "Estamos anulando el canje y devolviendo los puntos al cliente." : "Estamos anulando el canje sin devolver los puntos.",
      },
      success: {
        title: "Canje anulado",
        description: refund ? "El canje fue anulado y los puntos fueron devueltos al cliente." : "El canje fue anulado sin devolver los puntos.",
      },
      errorTitle: "No pudimos anular el canje",
    });

    if (result.ok) {
      reset();
      router.refresh();
    }
  }

  return (
    <Card className="overflow-hidden rounded-3xl border-border bg-card shadow-[0_14px_40px_rgba(25,24,23,0.06)]">
      <CardHeader className="border-b border-border px-5 py-5 sm:px-6">
        <CardTitle className="flex items-center gap-3 text-base tracking-[-0.02em]">
          <span className="grid size-10 place-items-center rounded-2xl bg-primary/10 text-foreground">
            <Ticket className="size-5" aria-hidden="true" />
          </span>
          <span>
            <span className="block">Validar canje</span>
            <span className="mt-1 block text-xs font-normal text-foreground/80"> Ingresá el código para consultar la recompensa. </span>
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-5 px-5 py-5 sm:px-6 sm:py-6">
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            await validate();
          }}
          className="flex flex-col gap-3 sm:flex-row sm:items-end"
        >
          <div className="flex flex-1 flex-col gap-2">
            <Label htmlFor="code" className="text-xs font-semibold uppercase tracking-[0.12em] text-foreground/80">
              Código de canje
            </Label>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-foreground/80" aria-hidden="true" />
              <Input
                id="code"
                required
                className="h-12 rounded-xl border-border bg-background pl-10 font-mono uppercase tracking-[0.18em] shadow-none placeholder:text-foreground/70 focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-foreground/70"
                placeholder="XXXXXX"
                value={code}
                onChange={(e) => setCode(e.target.value)}
              />
            </div>
          </div>
          <Button type="submit" className="h-12 rounded-xl bg-primary px-5 font-semibold text-primary-foreground hover:bg-primary/90">
            Buscar
          </Button>
        </form>
        <FieldError message={error} />
        {found && found.rewardId && found.userId ? (
          <div className="grid gap-4 rounded-2xl border border-border bg-background/60 p-4">
            <div className="flex gap-3">
              <img
                src={resolveAssetUrl(found.rewardImagePath) || "/placeholder.svg"}
                alt={found.rewardTitle}
                className="size-20 shrink-0 rounded-2xl border border-border object-cover"
              />
              <div className="min-w-0">
                <div className="flex flex-wrap items-start gap-2">
                  <h4 className="text-sm font-semibold text-foreground">{found.rewardTitle}</h4>
                  <Badge tone="primary" className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-foreground">
                    {found.rewardDiscountValue}
                  </Badge>
                </div>
                <p className="mt-1.5 text-xs leading-5 text-foreground/80"> {truncate(found.rewardDescription, 90)} </p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1 border-t border-border pt-3">
              <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-foreground/80">Cliente</span>
              <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-foreground/80">Canjeado</span>
              <span className="truncate text-sm font-medium text-foreground">{found.userName}</span>
              <span className="text-sm font-medium text-foreground">{found.formattedCreatedAt}</span>
              <span className="text-xs text-foreground/80">{found.rewardCostPoints} pts</span>
            </div>
            {!showCancel ? (
              <div className="grid gap-2 sm:grid-cols-2">
                <Button
                  className="h-11 rounded-xl bg-primary font-semibold text-primary-foreground hover:bg-primary/90"
                  onClick={confirmExchange}
                >
                  <CheckCircle2 className="size-4" aria-hidden="true" /> Confirmar entrega
                </Button>
                <Button
                  variant="outline"
                  className="h-11 rounded-xl border-border text-foreground hover:bg-background"
                  onClick={() => setShowCancel(true)}
                >
                  <XCircle className="size-4" aria-hidden="true" /> Anular canje
                </Button>
              </div>
            ) : (
              <div className="grid gap-3 rounded-2xl border border-primary/25 bg-primary/5 p-4">
                <label className="flex cursor-pointer items-start gap-2 text-sm text-foreground">
                  <input type="checkbox" checked={refund} onChange={(e) => setRefund(e.target.checked)} className="mt-0.5 size-4 accent-primary" />
                  <span>
                    Devolver los <strong>{found.rewardCostPoints} puntos</strong> al cliente
                  </span>
                </label>
                <div className="grid gap-2 sm:grid-cols-2">
                  <Button
                    variant="outline"
                    className="h-11 rounded-xl border-border bg-card text-foreground hover:bg-background"
                    onClick={() => setShowCancel(false)}
                  >
                    Volver
                  </Button>
                  <Button
                    className="h-11 rounded-xl bg-primary font-semibold text-primary-foreground hover:bg-primary/90"
                    onClick={cancelExchange}
                  >
                    Confirmar anulación
                  </Button>
                </div>
              </div>
            )}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
