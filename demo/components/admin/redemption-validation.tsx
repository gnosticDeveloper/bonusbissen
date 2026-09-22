"use client";

import { useToast } from "@/components/toast";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FieldError, Input, Label } from "@/components/ui/input";
import { formatDateTime, redemptionStatusLabel, relativeTime, truncate } from "@/lib/format";
import { cancelRedemption, confirmRedemption } from "@/lib/store";
import type { AdminUser, Redemption } from "@/lib/types";
import { useStoreData } from "@/lib/use-store";
import { CheckCircle2, Search, Ticket, XCircle } from "lucide-react";
import { useMemo, useState } from "react";

export function RedemptionValidation({ user }: { user: AdminUser }) {
  const { redemptions, rewards, customers } = useStoreData();
  const notify = useToast();
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [found, setFound] = useState<Redemption | null>(null);
  const [showCancel, setShowCancel] = useState(false);
  const [refund, setRefund] = useState(true);

  const reward = found ? rewards.find((r) => r.id === found.rewardId) : null;
  const customer = found ? customers.find((c) => c.id === found.customerId) : null;

  function validate(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setFound(null);
    setShowCancel(false);
    const normalized = code.trim().toUpperCase();
    if (!normalized) {
      setError("Ingresá un código de canje para validar.");
      return;
    }
    const match = redemptions.find((r) => r.code.toUpperCase() === normalized);
    if (!match) {
      setError("No encontramos ningún canje con ese código. Revisá que esté bien escrito.");
      return;
    }
    if (match.status !== "pending") {
      setError(`Este canje ya fue ${match.status === "confirmed" ? "confirmado" : "anulado"}. No se puede volver a resolver.`);
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

  const resolved = useMemo(
    () => [...redemptions].filter((r) => r.status !== "pending").sort((a, b) => +new Date(b.resolvedAt ?? 0) - +new Date(a.resolvedAt ?? 0)),
    [redemptions],
  );

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <div className="flex flex-col gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Ticket className="size-4 text-primary" /> Validar canje
            </CardTitle>
            <CardDescription>
              Para probar como funciona una validación, podes ingresar el siguiente código:
              <Button
                variant="link"
                className="cursor-pointer"
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText("BON-7F3K9Q");
                    notify("Código copiado!", "success");
                  } catch {}
                }}
              >
                BON-7F3K9Q
              </Button>
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <form onSubmit={validate} className="flex flex-col gap-3 sm:flex-row sm:items-end" noValidate>
              <div className="flex flex-1 flex-col gap-1.5">
                <Label htmlFor="code">Código de canje</Label>
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="code"
                    className="pl-9 font-mono uppercase tracking-wider"
                    placeholder="BON-XXXXXX"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                  />
                </div>
              </div>
              <Button type="submit" className="sm:w-auto">
                Buscar
              </Button>
            </form>
            <FieldError message={error} />

            {found && reward && customer ? (
              <div className="flex flex-col gap-4 rounded-xl border border-border bg-background/60 p-3">
                <div className="flex gap-3">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={reward.imageUrl || "/placeholder.svg"}
                    alt={reward.title}
                    className="size-20 shrink-0 rounded-lg border border-border object-cover"
                  />
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-semibold">{reward.title}</h4>
                      <Badge tone="primary">{reward.discountValue}</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed">{truncate(reward.description, 90)}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-x-4 gap-y-1 border-t border-border pt-3 text-sm">
                  <span className="text-xs text-muted-foreground">Cliente</span>
                  <span className="text-xs text-muted-foreground">Reclamado</span>
                  <span className="font-medium">{customer.name}</span>
                  <span className="font-medium">{relativeTime(found.claimedAt)}</span>
                  <span className="text-muted-foreground">{customer.phone}</span>
                  <span className="text-muted-foreground">{reward.pointsRequired} pts</span>
                </div>

                {!showCancel ? (
                  <div className="flex flex-col gap-2 sm:flex-row">
                    <Button
                      className="flex-1 py-2 bg-success text-success-foreground [a]:hover:bg-success/90 hover:bg-success/90"
                      onClick={() => {
                        confirmRedemption({
                          redemptionId: found.id,
                          byUserId: user.id,
                          byUserName: user.name,
                        });
                        notify("Canje confirmado correctamente.");
                        reset();
                      }}
                    >
                      <CheckCircle2 className="size-4" /> Confirmar
                    </Button>
                    <Button variant="destructive" className="flex-1 py-2" onClick={() => setShowCancel(true)}>
                      <XCircle className="size-4" /> Anular
                    </Button>
                  </div>
                ) : (
                  <div className="flex flex-col gap-3 rounded-lg border border-destructive/30 bg-destructive/5 p-3">
                    <label className="flex cursor-pointer items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={refund}
                        onChange={(e) => setRefund(e.target.checked)}
                        className="size-4 accent-[var(--primary)]"
                      />
                      Devolver los {reward.pointsRequired} puntos al cliente
                    </label>
                    <div className="flex gap-2">
                      <Button variant="outline" className="flex-1" onClick={() => setShowCancel(false)}>
                        Volver
                      </Button>
                      <Button
                        variant="destructive"
                        className="flex-1"
                        onClick={() => {
                          cancelRedemption({
                            redemptionId: found.id,
                            refundPoints: refund,
                            byUserId: user.id,
                            byUserName: user.name,
                          });
                          notify(refund ? "Canje anulado y puntos devueltos al cliente." : "Canje anulado sin devolver puntos.", "info");
                          reset();
                        }}
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
      </div>

      <Card className="flex flex-col">
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle>Canjes resueltos</CardTitle>
          <Badge tone="neutral">{resolved.length}</Badge>
        </CardHeader>
        <CardContent className="flex-1">
          {resolved.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">Todavía no hay canjes resueltos.</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {resolved.map((r) => {
                const rw = rewards.find((x) => x.id === r.rewardId);
                const cu = customers.find((x) => x.id === r.customerId);
                return (
                  <li key={r.id} className="flex flex-col gap-1 rounded-lg border border-border bg-background/60 p-3">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-semibold">{rw?.title ?? "Recompensa"}</span>
                      <Badge tone={r.status === "confirmed" ? "success" : "destructive"}>{redemptionStatusLabel(r.status)}</Badge>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {cu?.name ?? "Cliente"} · {cu?.phone ?? ""}
                    </span>
                    <div className="mt-1 grid gap-0.5 text-xs text-muted-foreground">
                      <span>Canjeado {relativeTime(r.claimedAt)}</span>
                      {r.resolvedAt ? (
                        <span>
                          Resuelto el {formatDateTime(r.resolvedAt)}
                          {r.resolvedByUserName ? ` · por ${r.resolvedByUserName}` : ""}
                        </span>
                      ) : null}
                      {r.status === "cancelled" ? (
                        <span className={r.pointsRefunded ? "text-success" : "text-destructive"}>
                          {r.pointsRefunded ? `Puntos devueltos al cliente (+${r.pointsSpent})` : "Puntos no devueltos"}
                        </span>
                      ) : null}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
