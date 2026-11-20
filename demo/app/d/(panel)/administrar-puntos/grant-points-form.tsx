"use client";

import { useState, type ReactNode, type FormEvent } from "react";
import { HandCoins, Wallet } from "lucide-react";
import { useModal } from "@/components/modal";
import { Button } from "@/components/ui/button";
import { FieldError, Input, Label } from "@/components/ui/input";
import { formatNumber } from "@/lib/helpers/format";
import type { CustomerOption as Customer } from "@/lib/demo/types";
import { DEBT_ERROR_PREFIX, grantPointsTo } from "@/lib/demo/actions";

const POINTS_PER_CURRENCY = 1000; // 1 punto por cada $1000 gastados
const MAX_SPEND = 10_000_000;
const MAX_POINTS = 1_000;


type Mode = "spend" | "manual";
type Operation = "add" | "subtract";
type GrantResult = Awaited<ReturnType<typeof grantPointsTo>>;

const inputClassName =
  "h-12 rounded-xl border-border bg-background shadow-none placeholder:text-foreground/70 focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/20";

/** Parses a string of digits into an integer in `1..max`; anything else is `null`. */
function parsePositiveInt(value: string, max: number): number | null {
  if (!/^\d+$/.test(value)) return null;
  const n = Number(value);
  return n > 0 && n <= max ? n : null;
}

function isDebtConfirmationRequired(result: GrantResult, points: number): boolean {
  return !result.ok && result.status === 409 && points < 0 && result.error.startsWith(DEBT_ERROR_PREFIX);
}

export function GrantPointsForm({ customer, onGranted }: { customer: Customer | null; onGranted: (customer: Customer) => void }) {
  const { runWithStatus, open, close } = useModal();
  const [mode, setMode] = useState<Mode>("spend");
  const [operation, setOperation] = useState<Operation>("add");
  const [note, setNote] = useState("");
  const [spend, setSpend] = useState("");
  const [manual, setManual] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  // Clearing the selected customer discards the amounts typed for them.
  const [previousCustomerId, setPreviousCustomerId] = useState(customer?.id);
  if (customer?.id !== previousCustomerId) {
    setPreviousCustomerId(customer?.id);
    if (!customer) {
      setSpend("");
      setManual("");
      setError(null);
    }
  }

  const spendAmount = parsePositiveInt(spend, MAX_SPEND);
  const spendPoints = spendAmount == null ? 0 : Math.floor(spendAmount / POINTS_PER_CURRENCY);
  const manualPoints = parsePositiveInt(manual, MAX_POINTS);
  const points = mode === "spend" ? spendPoints : manualPoints == null ? 0 : operation === "subtract" ? -manualPoints : manualPoints;
  const isValidAmount = points !== 0;

  function showResult(target: Customer, amount: number, action: () => Promise<GrantResult>) {
    return runWithStatus(action, {
      loading: {
        title: "Registrando puntos",
        description: `Estamos registrando ${formatNumber(Math.abs(amount))} puntos para ${target.name}.`,
      },
      success: ({ pointsGranted, userName }) => ({
        title: "Movimiento registrado",
        description: `Se ${pointsGranted < 0 ? "restaron" : "sumaron"} ${formatNumber(Math.abs(pointsGranted))} puntos a ${userName}.`,
      }),
      errorTitle: "No pudimos registrar los puntos",
    });
  }

  function handleGranted(target: Customer, submittedMode: Mode) {
    onGranted(target);
    if (submittedMode === "spend") setSpend("");
    else setManual("");
  }

  async function confirmDebt(target: Customer, amount: number, submittedMode: Mode) {
    const shown = await showResult(target, amount, () => grantPointsTo(target.id, amount, note, true));
    if (shown.ok) handleGranted(target, submittedMode);
  }

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!customer || pending) return;

    if (!isValidAmount) {
      setError(
        mode === "spend"
          ? `Ingresá un monto gastado válido, desde $${formatNumber(POINTS_PER_CURRENCY)} hasta $${formatNumber(MAX_SPEND)}, sin decimales.`
          : `Ingresá una cantidad de 1 a ${formatNumber(MAX_POINTS)} puntos.`,
      );
      return;
    }

    setError(null);
    setPending(true);
    const target = customer;
    const amount = points;
    const submittedMode = mode;

    try {
      const result = await grantPointsTo(target.id, amount, note);

      if (isDebtConfirmationRequired(result, amount)) {
        open(
          <div className="grid gap-4">
            <p className="text-sm">{!result.ok && result.error}</p>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={close}>Cancelar</Button>
              <Button type="button" onClick={() => void confirmDebt(target, amount, submittedMode)}>Confirmar deuda</Button>
            </div>
          </div>,
          { title: "Saldo insuficiente", description: "Esta resta dejaría al cliente con una deuda." },
        );
        return;
      }

      const shown = await showResult(target, amount, async () => result);
      if (shown.ok) handleGranted(target, submittedMode);
    } finally {
      setPending(false);
    }
  }

  return (
    <>
      <div className="grid grid-cols-2 gap-1 rounded-2xl border border-border bg-background p-1.5" data-tour="grant-mode">
        <ModeButton active={mode === "spend"} onClick={() => setMode("spend")}>
          <Wallet className="size-4" aria-hidden="true" />
          Por monto
        </ModeButton>
        <ModeButton active={mode === "manual"} onClick={() => setMode("manual")}>
          <HandCoins className="size-4" aria-hidden="true" />
          Manual
        </ModeButton>
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
                className={`${inputClassName} pl-8`}
              />
            </div>
            <p className="text-xs leading-5 text-foreground/80">
              1 punto por cada ${POINTS_PER_CURRENCY} gastados. Se sumarán{" "}
              <span className="font-semibold text-foreground">{formatNumber(spendPoints)} puntos</span>.
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            <div className="grid grid-cols-2 gap-2">
              <Button type="button" variant={operation === "add" ? "default" : "outline"} onClick={() => setOperation("add")}>Sumar</Button>
              <Button type="button" variant={operation === "subtract" ? "default" : "outline"} onClick={() => setOperation("subtract")}>Restar</Button>
            </div>
            <Label htmlFor="manual" className="text-sm font-medium">
              Puntos a {operation === "subtract" ? "restar" : "sumar"}
            </Label>
            <Input
              id="manual"
              inputMode="numeric"
              placeholder="Ej. 100"
              autoComplete="off"
              value={manual}
              onChange={(e) => setManual(e.target.value.replace(/[^\d]/g, ""))}
              className={inputClassName}
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
            className={inputClassName}
          />
        </div>

        <FieldError message={error} />

        <Button
          type="submit"
          className="mt-1 h-12 w-full rounded-xl bg-primary font-semibold text-primary-foreground shadow-sm transition-transform hover:bg-primary/90 active:scale-[0.99] disabled:opacity-50"
          disabled={!customer || !isValidAmount || pending}
        >
          {mode === "manual" && operation === "subtract" ? "Restar puntos" : "Sumar puntos"}
        </Button>
      </form>
    </>
  );
}

function ModeButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <Button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      variant={active ? "default" : "ghost"}
      className={`h-10 rounded-xl text-xs font-semibold ${
        active ? "bg-primary text-primary-foreground shadow-sm hover:bg-primary/90" : "text-foreground/80 hover:bg-card hover:text-foreground"
      }`}
    >
      {children}
    </Button>
  );
}
