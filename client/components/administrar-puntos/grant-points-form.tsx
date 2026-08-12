"use client";

import { useState } from "react";
import { UserPlus, CircleCheck } from "lucide-react";
import CreateCustomerModal from "@/components/administrar-puntos/create-customer-modal";
import { CustomerAutocomplete } from "@/components/administrar-puntos/customer-autocomplete";
import { grantPointsToCustomer } from "@/app/(employees)/actions";
import { Customer } from "@/lib/definitions";

export default function GrantPointsForm() {
  const [showCreateModal, setShowCreateModal] = useState(false);

  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [amountInput, setAmountInput] = useState("");
  const [granting, setGranting] = useState(false);
  const [grantError, setGrantError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const parsedAmount = Number(amountInput);
  const computedPoints =
    amountInput && !Number.isNaN(parsedAmount) && parsedAmount > 0
      ? Math.floor(parsedAmount / 1000)
      : 0;

  function clearSelection() {
    setSelectedCustomer(null);
    setAmountInput("");
    setSuccessMessage(null);
    setGrantError(null);
  }

  function handleCustomerCreated(customer: Customer) {
    setShowCreateModal(false);
    setSelectedCustomer(customer);
    setAmountInput("");
    setSuccessMessage(null);
    setGrantError(null);
  }

  async function handleConfirm() {
    if (!selectedCustomer || computedPoints <= 0) return;

    setGranting(true);
    setGrantError(null);

    const result = await grantPointsToCustomer(selectedCustomer.id, computedPoints);
    if (result.ok) {
      const { pointsGranted, customerName } = result.data;
      setSuccessMessage(`Le sumaste ${pointsGranted} puntos a ${customerName}.`);
      // TODO: reincorporar cuando CustomerResponse traiga `points` del backend.
      // setSelectedCustomer((prev) =>
      //   prev ? { ...prev, points: prev.points + pointsGranted } : prev
      // );
      setAmountInput("");
    } else {
      setGrantError(result.error);
    }
    setGranting(false);
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <span className="text-lg text-ink-soft">Cliente</span>
        <CustomerAutocomplete
          selected={selectedCustomer}
          onSelect={setSelectedCustomer}
          onClear={clearSelection}
        />
        <button
          type="button"
          onClick={() => setShowCreateModal(true)}
          className="self-start w-full flex items-center justify-center gap-2 rounded-xl bg-sage px-6 py-3 text-xl font-medium text-cream hover:bg-sage-dark transition-colors"
        >
          <UserPlus className="h-5 w-5" />
          Crear cliente
        </button>
      </div>

      <div className="flex flex-col gap-2">
        <label className="flex flex-col gap-2">
          <span className="text-lg text-ink-soft">
            Monto total gastado ($) {!selectedCustomer ? "• Seleccione un cliente para ingresar el monto total gastado" : null}
          </span>
          <input
            type="number"
            min={0}
            step={1}
            value={amountInput}
            onChange={(e) => setAmountInput(e.target.value)}
            disabled={!selectedCustomer}
            placeholder="Ej: 15600"
            className="rounded-xl border border-ink/15 bg-cream-dark/30 px-5 py-3 text-xl text-ink placeholder:text-ink-soft/70 outline-none focus:border-amber disabled:opacity-50"
          />
        </label>
        <p className="text-lg text-ink-soft">
          Se le van a sumar <strong className="text-amber-dark">{computedPoints}</strong> puntos.
        </p>
      </div>

      {grantError && <p className="text-lg text-rust-dark">{grantError}</p>}
      {successMessage && <p className="text-lg text-sage-dark">{successMessage}</p>}

      <button
        type="button"
        onClick={handleConfirm}
        disabled={!selectedCustomer || computedPoints <= 0 || granting}
        className="rounded-2xl bg-amber px-6 py-4 text-xl font-semibold text-cream hover:bg-amber-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {granting ? "Sumando..." : "Confirmar"}
      </button>

      {showCreateModal && (
        <CreateCustomerModal onCancel={() => setShowCreateModal(false)} onCreated={handleCustomerCreated} />
      )}
    </div>
  );
}
