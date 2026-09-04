"use client";

import { CustomerAutocomplete } from "@/components/customer-autocomplete";
import { useToast } from "@/components/toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FieldError, Input, Label } from "@/components/ui/input";
import { formatPoints, parsePositiveInt } from "@/lib/helpers/format";
import { Coins, HandCoins, Wallet } from "lucide-react";
import { useMemo, useState } from "react";
import PointActionList from "@/components/point-action-list";
import { grantPointsTo } from "./actions";
import { Customer } from "@/lib/types/customer";

const POINTS_PER_CURRENCY = 1000; // 1 punto por cada $1000 gastados
const MAX_SPEND = 10_000_000;
const MAX_POINTS = 1_000;

export default function PointsManagerPage() {
  const notify = useToast();
  const [mode, setMode] = useState<"spend" | "manual">("spend");

  const [refreshKey, setRefreshKey] = useState(0);

  // dentro de submit(), en los dos branches donde hacés notify(..., "success"):

  const [selected, setSelected] = useState<Customer | null>(null);
  const [granting, setGranting] = useState(false);
  // TODO: Notes are not implemented yet in the backend database.
  const [note, setNote] = useState("");
  const [spend, setSpend] = useState("");
  const [manual, setManual] = useState("");
  const [error, setError] = useState<string | null>(null);

  const computedFromSpend = useMemo(() => {
    const n = parsePositiveInt(spend, { max: MAX_SPEND });
    return n ? Math.floor(n / POINTS_PER_CURRENCY) : 0;
  }, [spend]);

  function clearSelection() {
    setSelected(null);
    setSpend("");
    setManual("");
    setError(null);
  }

  async function submit() {
    if (!selected) return;

    setGranting(true);
    setError(null);

    if (mode === "spend") {
      const amount = parsePositiveInt(spend, { max: MAX_SPEND });
      if (amount == null) {
        setError("Ingresá un monto gastado válido (número mayor a 0, sin decimales).");
        return;
      }
      const points = Math.floor(amount / POINTS_PER_CURRENCY);
      if (points <= 0) {
        setError(`El monto es muy bajo para sumar puntos (mínimo $${POINTS_PER_CURRENCY}).`);
        return;
      }
      const result = await grantPointsTo(selected.id, points);
      if (result.ok) {
        const { pointsGranted, customerName } = result.data;
        notify(`Se sumaron ${formatPoints(pointsGranted)} puntos a ${customerName}.`, "success");
        setRefreshKey((k) => k + 1);
        setSpend("");
      } else {
        setError(result.error);
      }
    } else {
      const points = parsePositiveInt(manual, { max: MAX_POINTS });
      if (points == null) {
        setError("Ingresá una cantidad de puntos válida (número entero mayor a 0).");
        return;
      }
      const result = await grantPointsTo(selected.id, points);
      if (result.ok) {
        const { pointsGranted, customerName } = result.data;
        notify(`Se sumaron ${formatPoints(pointsGranted)} puntos a ${customerName}.`, "success");
        setRefreshKey((k) => k + 1);
        setManual("");
      } else {
        setError(result.error);
        notify("Ocurrió un error inesperado al intentar sumar los puntos", "error");
      }
    }
    setGranting(false);
  }

  const isNotValidAmount =
    ((Number(spend) < POINTS_PER_CURRENCY || Number(spend) > MAX_SPEND) && mode === "spend") ||
    ((Number(manual) <= 0 || Number(manual) > MAX_SPEND) && mode === "manual");

  return (
    <div className="grid gap-4 lg:grid-cols-5">
      <div className="flex flex-col gap-4 lg:col-span-2">
        <Card>
          <CardHeader className="flex flex-row items-start">
            <CardTitle className="flex items-center gap-2">
              <Coins className="size-4 text-primary" /> Otorgar puntos
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label>Cliente</Label>
              <CustomerAutocomplete selected={selected} onSelect={setSelected} onClear={clearSelection} />
            </div>

            <div className="grid grid-cols-2 gap-1 rounded-lg bg-muted p-1">
              <Button type="button" onClick={() => setMode("spend")} variant={mode === "spend" ? "default" : "ghost"}>
                <Wallet className="size-4" /> Por monto
              </Button>
              <Button type="button" onClick={() => setMode("manual")} variant={mode === "manual" ? "default" : "ghost"}>
                <HandCoins className="size-4" /> Puntos manuales
              </Button>
            </div>

            <form onSubmit={submit} className="flex flex-col gap-3" noValidate>
              {mode === "spend" ? (
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="spend">Monto gastado ($)</Label>
                  <Input
                    id="spend"
                    inputMode="numeric"
                    placeholder="Ej: 12000"
                    value={spend}
                    onChange={(e) => setSpend(e.target.value.replace(/[^\d]/g, ""))}
                  />
                  <p className="text-xs text-muted-foreground">
                    Conversión: 1 punto por cada ${POINTS_PER_CURRENCY}. Sumará{" "}
                    <span className="font-semibold text-primary">{formatPoints(computedFromSpend)} puntos</span>.
                  </p>
                </div>
              ) : (
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="manual">Puntos a sumar</Label>
                  <Input
                    id="manual"
                    inputMode="numeric"
                    placeholder="Ej: 100"
                    value={manual}
                    onChange={(e) => setManual(e.target.value.replace(/[^\d]/g, ""))}
                  />
                </div>
              )}

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="note">Nota (opcional)</Label>
                <Input id="note" maxLength={120} placeholder="Detalle del movimiento" value={note} onChange={(e) => setNote(e.target.value)} />
              </div>

              <FieldError message={error} />
              <Button type="submit" className="w-full" disabled={isNotValidAmount || granting}>
                Sumar puntos
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>

      <PointActionList refreshKey={refreshKey} />
    </div>
  );
}
