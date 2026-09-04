"use client";
import { annulateExchange, confirmRedemption, Redemption, validateCode } from "@/app/[orgId]/(employee)/dashboard/redemptions/actions";
import { useToast } from "@/components/toast";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FieldError, Input, Label } from "@/components/ui/input";
import { relativeTime, truncate } from "@/lib/helpers/format";
import { CheckCircle2, Search, Ticket, XCircle } from "lucide-react";
import { useState } from "react";

export default function RedemptionValidator() {
  const notify = useToast();
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [found, setFound] = useState<Redemption | null>(null);
  const [showCancel, setShowCancel] = useState(false);
  const [refund, setRefund] = useState(true);

  async function validate() {
    setError(null);
    setFound(null);
    setShowCancel(false);
    const normalized = code.trim().toUpperCase();
    if (!normalized) {
      setError("Ingresá un código de canje para validar.");
      return;
    }
    const match = await validateCode(code);
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

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Ticket className="size-4 text-primary" /> Validar canje
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            await validate();
          }}
          className="flex flex-col gap-3 sm:flex-row sm:items-end"
        >
          <div className="flex flex-1 flex-col gap-1.5">
            <Label htmlFor="code">Código de canje</Label>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="code"
                required
                className="pl-9 font-mono uppercase tracking-wider"
                placeholder="XXXXXX"
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

        {found && found.reward && found.customer ? (
          <div className="flex flex-col gap-4 rounded-xl border border-border bg-background/60 p-3">
            <div className="flex gap-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={found.reward.imagePath || "/placeholder.svg"}
                alt={found.reward.title}
                className="size-20 shrink-0 rounded-lg border border-border object-cover"
              />
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-2">
                  <h4 className="text-sm font-semibold">{found.reward.title}</h4>
                  <Badge tone="primary">{found.reward.discountValue}</Badge>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">{truncate(found.reward.description, 90)}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-x-4 gap-y-1 border-t border-border pt-3 text-sm">
              <span className="text-xs text-muted-foreground">Cliente</span>
              <span className="text-xs text-muted-foreground">Reclamado</span>
              <span className="font-medium">{found.customer.name}</span>
              <span className="font-medium">{relativeTime(found.redeemedAt)}</span>
              <span className="text-muted-foreground">{found.customer.phone}</span>
              <span className="text-muted-foreground">{found.reward.pointsRequired} pts</span>
            </div>

            {!showCancel ? (
              <div className="flex flex-col gap-2 sm:flex-row">
                <Button
                  className="flex-1 py-2 bg-success text-success-foreground [a]:hover:bg-success/90 hover:bg-success/90"
                  onClick={async () => {
                    await confirmRedemption(found.id);
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
                  <input type="checkbox" checked={refund} onChange={(e) => setRefund(e.target.checked)} className="size-4 accent-(--primary)" />
                  Devolver los {found.reward.pointsRequired} puntos al cliente
                </label>
                <div className="flex gap-2">
                  <Button variant="outline" className="flex-1" onClick={() => setShowCancel(false)}>
                    Volver
                  </Button>
                  <Button
                    variant="destructive"
                    className="flex-1"
                    onClick={async () => {
                      await annulateExchange(found.id);
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
  );
}
