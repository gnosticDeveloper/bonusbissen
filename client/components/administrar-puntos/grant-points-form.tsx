"use client";

import { useMemo, useState } from "react";
import { HandCoins, UserPlus, Wallet } from "lucide-react";
import CreateCustomerModal from "@/components/administrar-puntos/create-customer-modal";
import { CustomerAutocomplete } from "@/components/administrar-puntos/customer-autocomplete";
import { grantPointsToCustomer } from "@/app/(employees)/actions";
import { Customer } from "@/lib/definitions";
import { formatPoints, parsePositiveInt } from "@/lib/format";
import { cn } from "@/lib/utils";
import { FieldError, Input, Label } from "../ui/input";
import { Button } from "../ui/button";

const POINTS_PER_CURRENCY = 1000; // 1 punto por cada $1000 gastados
const MAX_SPEND = 10_000_000;
const MAX_POINTS = 1_000_000;

export default function GrantPointsForm() {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [mode, setMode] = useState<"spend" | "manual">("spend");

  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [granting, setGranting] = useState(false);
  const [spend, setSpend] = useState("");
  const [manual, setManual] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const computedFromSpend = useMemo(() => {
    const n = parsePositiveInt(spend, { max: MAX_SPEND });
    return n ? Math.floor(n / POINTS_PER_CURRENCY) : 0;
  }, [spend]);

  function clearSelection() {
    setSelectedCustomer(null);
    setSuccessMessage(null);
    setSpend("");
    setManual("");
    setError(null);
  }

  function handleCustomerCreated(customer: Customer) {
    setShowCreateModal(false);
    setSelectedCustomer(customer);
    setSpend("");
    setManual("");
    setSuccessMessage(null);
    setError(null);
  }

  async function handleConfirm() {
    console.log({ selectedCustomer, computedFromSpend, mode, spend, manual });
    if (!selectedCustomer) return;

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
      const result = await grantPointsToCustomer(selectedCustomer.id, points);
      if (result.ok) {
        const { pointsGranted, customerName } = result.data;
        setSuccessMessage(`Se sumaron ${formatPoints(pointsGranted)} puntos a ${customerName}.`);
        // TODO: reincorporar cuando CustomerResponse traiga `points` del backend.
        // setSelectedCustomer((prev) =>
        //   prev ? { ...prev, points: prev.points + pointsGranted } : prev
        // );
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
      const result = await grantPointsToCustomer(selectedCustomer.id, points);
      if (result.ok) {
        const { pointsGranted, customerName } = result.data;
        setSuccessMessage(`Se sumaron ${formatPoints(pointsGranted)} puntos a ${customerName}.`);
        // TODO: reincorporar cuando CustomerResponse traiga `points` del backend.
        // setSelectedCustomer((prev) =>
        //   prev ? { ...prev, points: prev.points + pointsGranted } : prev
        // );
        setManual("");
      } else {
        setError(result.error);
      }
    }
    setGranting(false);
  }

  const isNotValidAmount =
    ((Number(spend) < POINTS_PER_CURRENCY || Number(spend) > MAX_SPEND) && mode === "spend") ||
    ((Number(manual) <= 0 || Number(manual) > MAX_SPEND) && mode === "manual");

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <span className="text-lg text-ink-soft">Cliente</span>
        <CustomerAutocomplete selected={selectedCustomer} onSelect={setSelectedCustomer} onClear={clearSelection} />
        <button
          type="button"
          onClick={() => setShowCreateModal(true)}
          className="self-start w-full flex items-center justify-center gap-2 rounded-xl bg-sage px-6 py-3 text-xl font-medium text-cream hover:bg-sage-dark transition-colors"
        >
          <UserPlus className="h-5 w-5" />
          Crear cliente
        </button>
      </div>

      <div className="grid grid-cols-2 gap-2 rounded-lg p-1">
        <button
          type="button"
          onClick={() => setMode("spend")}
          className={cn(
            "flex items-center border-muted-foreground border justify-center gap-1.5 rounded-md px-2 py-1.5 text-sm font-medium transition-colors",
            mode === "spend" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
          )}
        >
          <Wallet className="size-4" /> Por monto
        </button>
        <button
          type="button"
          onClick={() => setMode("manual")}
          className={cn(
            "flex items-center justify-center border-muted-foreground border gap-1.5 rounded-md px-2 py-1.5 text-sm font-medium transition-colors",
            mode === "manual" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
          )}
        >
          <HandCoins className="size-4" /> Puntos manuales
        </button>
      </div>

      <div className="flex flex-col gap-3">
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
              Conversión: 1 punto por cada ${POINTS_PER_CURRENCY}.{" "}
              {Number(spend) > MAX_SPEND ? (
                <span className="font-semibold text-red-500">SUPERASTE EL LÍMITE (Máximo: {formatPoints(MAX_SPEND)})</span>
              ) : Number(spend) < POINTS_PER_CURRENCY ? (
                <span className="font-semibold text-red-500">MÍNIMO: {formatPoints(POINTS_PER_CURRENCY)}</span>
              ) : (
                <span>
                  Sumará <strong className="text-primary">{formatPoints(computedFromSpend)} puntos</strong>
                </span>
              )}
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
        {successMessage && <p className="text-lg text-sage-dark">{successMessage}</p>}
        <FieldError message={error} />
        <Button type="button" onClick={handleConfirm} className="w-full" disabled={!selectedCustomer || granting || isNotValidAmount}>
          {granting ? "Sumando..." : "Sumar puntos"}
        </Button>
      </div>

      {showCreateModal && <CreateCustomerModal onCancel={() => setShowCreateModal(false)} onCreated={handleCustomerCreated} />}
    </div>
  );
}
