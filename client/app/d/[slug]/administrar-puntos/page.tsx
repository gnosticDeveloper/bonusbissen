"use client";

import { useModal } from "@/components/modal";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FieldError, Input, Label } from "@/components/ui/input";
import { formatPoints, parsePositiveInt } from "@/lib/helpers/format";
import { Coins, HandCoins, Wallet } from "lucide-react";
import { SubmitEvent, useMemo, useState } from "react";
import PointActionList from "@/components/point-action-list";
import { getAllCustomers, grantPointsTo } from "./actions";
import { Customer } from "@/lib/types/customer";
import { Autocomplete } from "@/components/autocomplete-input";

const POINTS_PER_CURRENCY = 1000; // 1 punto por cada $1000 gastados
const MAX_SPEND = 10_000_000;
const MAX_POINTS = 1_000;

export default function PointsManagerPage() {
  const { runAction } = useModal();
  const [mode, setMode] = useState<"spend" | "manual">("spend");

  const [refreshKey, setRefreshKey] = useState(0);

  const [selected, setSelected] = useState<Customer | null>(null);
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

  async function submit(e: SubmitEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!selected) return;

    setError(null);

    let points: number;
    if (mode === "spend") {
      const amount = parsePositiveInt(spend, { max: MAX_SPEND });

      if (amount == null) {
        setError("Ingresá un monto gastado válido (número mayor a 0, sin decimales).");
        return;
      }

      points = Math.floor(amount / POINTS_PER_CURRENCY);
      if (points <= 0) {
        setError(`El monto es muy bajo para sumar puntos (mínimo $${POINTS_PER_CURRENCY}).`);
        return;
      }
    } else {
      const manualPoints = parsePositiveInt(manual, { max: MAX_POINTS });
      if (manualPoints == null) {
        setError("Sumar puntos manualmente solo admite cantidades de 1 a 1000.");
        return;
      }
      points = manualPoints;
    }

    const result = await runAction(() => grantPointsTo(selected.id, points, note), {
      loading: {
        title: "Sumando puntos",
        description: `Estamos registrando ${formatPoints(points)} puntos para ${selected.name}.`,
      },
      success: ({ pointsGranted, userName }) => ({
        title: "Puntos otorgados",
        description: `Se sumaron ${formatPoints(pointsGranted)} puntos a ${userName}.`,
      }),
      errorTitle: "No pudimos sumar los puntos",
    });

    if (!result.ok) return;

    setRefreshKey((key) => key + 1);
    if (mode === "spend") setSpend("");
    else setManual("");
  }

  const isNotValidAmount =
    ((Number(spend) < POINTS_PER_CURRENCY || Number(spend) > MAX_SPEND) && mode === "spend") ||
    ((Number(manual) <= 0 || Number(manual) > MAX_SPEND) && mode === "manual");

  return (
    <main className="mx-auto min-h-0 w-full text-foreground">
      <header className="mb-7 lg:mb-3">
        <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-foreground">Programa de fidelización</p>
        <h1 className="text-3xl font-semibold tracking-tighter sm:text-4xl">Otorgar puntos</h1>
        <p className="mt-2 text-sm leading-6 text-foreground/80">Sumá puntos a la cuenta de un cliente según su compra o ingresá una cantidad manualmente.</p>
      </header>

      <div className="grid min-h-0 gap-5 lg:grid-cols-5">
        <Card className="overflow-hidden rounded-3xl border-border bg-card shadow-[0_14px_40px_rgba(25,24,23,0.06)] lg:col-span-2">
          <CardHeader className="border-b border-border px-5 py-5 sm:px-6">
            <CardTitle className="flex items-center gap-3 text-base tracking-[-0.02em]">
              <span className="grid size-10 place-items-center rounded-2xl bg-primary/10 text-foreground">
                <Coins className="size-5" aria-hidden="true" />
              </span>
              <span>
                <span className="block">Sumar puntos</span>
                <span className="mt-1 block text-xs font-normal text-foreground/80">Elegí un cliente y registrá su movimiento.</span>
              </span>
            </CardTitle>
          </CardHeader>

          <CardContent className="flex flex-col gap-5 px-5 py-5 sm:px-6 sm:py-6">
            <div className="flex flex-col gap-2">
              <Label className="text-xs font-semibold uppercase tracking-[0.12em] text-foreground/80">Cliente</Label>
              <Autocomplete<Customer>
                selected={selected}
                onSelect={setSelected}
                onClear={clearSelection}
                fetchFn={getAllCustomers}
                getId={(c) => c.id}
                displayKeys={["name", "username"]}
                // Note: the backend threw me a null points here. I used the ?? operator to avoid null errors when calling formatPoints. I should check the workflow better.
                badge={(c) => `${formatPoints(c.points ?? 0)} pts`}
                placeholder="Buscar por nombre o email…"
              />
            </div>

            <div className="grid grid-cols-2 gap-1 rounded-2xl border border-border bg-background p-1.5">
              <Button
                type="button"
                onClick={() => setMode("spend")}
                variant={mode === "spend" ? "default" : "ghost"}
                className={`h-10 rounded-xl text-xs font-semibold ${
                  mode === "spend"
                    ? "bg-primary text-primary-foreground shadow-sm hover:bg-primary/90"
                    : "text-foreground/80 hover:bg-card hover:text-foreground"
                }`}
              >
                <Wallet className="size-4" aria-hidden="true" />
                Por monto
              </Button>
              <Button
                type="button"
                onClick={() => setMode("manual")}
                variant={mode === "manual" ? "default" : "ghost"}
                className={`h-10 rounded-xl text-xs font-semibold ${
                  mode === "manual"
                    ? "bg-primary text-primary-foreground shadow-sm hover:bg-primary/90"
                    : "text-foreground/80 hover:bg-card hover:text-foreground"
                }`}
              >
                <HandCoins className="size-4" aria-hidden="true" />
                Manual
              </Button>
            </div>

            <form onSubmit={submit} className="flex flex-col gap-4" noValidate>
              {mode === "spend" ? (
                <div className="flex flex-col gap-2">
                  <Label htmlFor="spend" className="text-sm font-medium">
                    Monto gastado
                  </Label>
                  <div className="relative">
                    <span className="pointer-events-none absolute inset-y-0 left-3.5 flex items-center text-sm font-semibold text-foreground/80">$</span>
                    <Input
                      id="spend"
                      inputMode="numeric"
                      placeholder="Ej. 12000"
                      autoComplete="off"
                      value={spend}
                      onChange={(e) => setSpend(e.target.value.replace(/[^\d]/g, ""))}
                      className="h-12 rounded-xl border-border bg-background pl-8 shadow-none placeholder:text-foreground/70 focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/20"
                    />
                  </div>
                  <p className="text-xs leading-5 text-foreground/80">
                    1 punto por cada ${POINTS_PER_CURRENCY}. Se sumarán{" "}
                    <span className="font-semibold text-foreground">{formatPoints(computedFromSpend)} puntos</span>.
                  </p>
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  <Label htmlFor="manual" className="text-sm font-medium">
                    Puntos a sumar
                  </Label>
                  <Input
                    id="manual"
                    inputMode="numeric"
                    placeholder="Ej. 100"
                    autoComplete="off"
                    value={manual}
                    onChange={(e) => setManual(e.target.value.replace(/[^\d]/g, ""))}
                    className="h-12 rounded-xl border-border bg-background shadow-none placeholder:text-foreground/70 focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/20"
                  />
                </div>
              )}

              <div className="flex flex-col gap-2">
                <Label htmlFor="note" className="text-sm font-medium">
                  Nota <span className="font-normal text-foreground/80">(opcional)</span>
                </Label>
                <Input
                  id="note"
                  maxLength={120}
                  placeholder="Ej. Compra del mediodía"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  className="h-12 rounded-xl border-border bg-background shadow-none placeholder:text-foreground/70 focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/20"
                />
              </div>

              <FieldError message={error} />

              <Button
                type="submit"
                className="mt-1 h-12 w-full rounded-xl bg-primary font-semibold text-primary-foreground shadow-sm transition-transform hover:bg-primary/90 active:scale-[0.99] disabled:opacity-50"
                disabled={isNotValidAmount}
              >
                Sumar puntos
              </Button>
            </form>
          </CardContent>
        </Card>

        <PointActionList selected={selected} refreshKey={refreshKey} />
      </div>
    </main>
  );
}
