"use client";

import { SubmitEventHandler, useState } from "react";
import { Search, UserPlus, CircleCheck } from "lucide-react";
import CreateCustomerModal from "@/components/administrar-puntos/create-customer-modal";
import { normalizePhoneNumber } from "@/lib/normalize-phone-number";
import { getCustomerByPhone, grantPointsToCustomer } from "@/app/(employees)/actions";
import { Customer } from "@/lib/definitions";

export default function GrantPointsForm() {
  const [phoneInput, setPhoneInput] = useState("");
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [notFoundPhone, setNotFoundPhone] = useState<string | null>(null);
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

  function selectCustomer(customer: Customer) {
    setSelectedCustomer(customer);
    setNotFoundPhone(null);
    setAmountInput("");
    setSuccessMessage(null);
    setGrantError(null);
  }

  const handler: SubmitEventHandler = async (e) => {
    e.preventDefault();

    const normalizedPhone = normalizePhoneNumber(phoneInput);
    if (!normalizedPhone) {
      setSearchError("Ingresá un teléfono con formato válido. Por ejemplo, 1234-567890");
      return;
    }

    setSearchError(null);
    setSearching(true);
    setNotFoundPhone(null);

    try {
      const customer = await getCustomerByPhone(normalizedPhone);
      setSearching(false);
      if (customer) {
        selectCustomer(customer);
      } else {
        setSelectedCustomer(null);
        setNotFoundPhone(normalizedPhone);
      }
    } catch {
      setSearching(false);
      setNotFoundPhone(normalizedPhone);
    }
  }

  function handleCustomerCreated(customer: Customer) {
    setShowCreateModal(false);
    selectCustomer(customer);
  }

  async function handleConfirm() {
    if (!selectedCustomer || computedPoints <= 0) return;

    setGranting(true);
    setGrantError(null);

    try {
      const result = await grantPointsToCustomer(selectedCustomer.id, computedPoints);
      setSuccessMessage(`Le sumaste ${result.pointsGranted} puntos a ${result.customerName}.`);
      console.log({ result, newAmount: selectedCustomer.points + result.pointsGranted })
      setSelectedCustomer((prev) =>
        prev ? { ...prev, points: prev.points + result.pointsGranted } : prev
      );
      setAmountInput("");
    } catch {
      setGrantError("No pudimos sumar los puntos. Probá de nuevo.");
    } finally {
      setGranting(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <form onSubmit={handler} className="flex gap-3">
        <input
          type="tel"
          value={phoneInput}
          onChange={(e) => setPhoneInput(e.target.value)}
          placeholder="Teléfono del cliente"
          className="flex-1 rounded-xl border border-ink/15 bg-cream-dark/30 px-5 py-3 text-xl text-ink placeholder:text-ink-soft/70 outline-none focus:border-amber"
        />
        <button
          type="submit"
          disabled={searching}
          className="flex items-center gap-2 rounded-xl bg-amber px-6 py-3 text-xl font-medium text-cream hover:bg-amber-dark transition-colors disabled:opacity-50"
        >
          <Search className="h-5 w-5" />
          {searching ? "Buscando..." : "Buscar"}
        </button>
        <button
          type="button"
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 rounded-xl bg-sage px-6 py-3 text-xl font-medium text-cream hover:bg-sage-dark transition-colors"
        >
          <UserPlus className="h-5 w-5" />
          Crear cliente
        </button>
      </form>

      {searchError && <p className="text-lg text-rust-dark">{searchError}</p>}

      {notFoundPhone && (
        <p className="text-lg text-ink-soft">
          No encontramos ningún cliente con ese teléfono. Usá &quot;Crear cliente&quot;
          si es alguien nuevo.
        </p>
      )}

      {selectedCustomer && (
        <div className="rounded-2xl border border-sage/30 bg-sage/10 px-5 py-4 flex flex-col gap-1">
          <div className="flex items-center gap-2 text-sage-dark">
            <CircleCheck className="h-5 w-5" />
            <span className="text-lg font-medium">Cliente seleccionado</span>
          </div>
          <p className="text-xl font-semibold text-ink">{selectedCustomer.name}</p>
          <p className="text-lg text-ink-soft">
            {selectedCustomer.phone} · {selectedCustomer.points > 0 ? `${selectedCustomer.points} puntos actuales` : "Sin puntos"}
          </p>
        </div>
      )}

      <div className="flex flex-col gap-2">
        <label className="flex flex-col gap-2">
          <span className="text-lg text-ink-soft">Monto total gastado ($) {!selectedCustomer ? "• Seleccione un cliente para ingresar el monto total gastado": null}</span>
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
        <CreateCustomerModal
          initialPhone={phoneInput}
          onCancel={() => setShowCreateModal(false)}
          onCreated={handleCustomerCreated}
        />
      )}
    </div>
  );
}
