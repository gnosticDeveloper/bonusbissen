"use client";

import { SubmitEventHandler, useState } from "react";
import { X } from "lucide-react";
import { normalizePhoneNumber } from "@/lib/normalize-phone-number";
import { createCustomer, reactivateCustomer } from "@/app/customers.actions";
import { Customer } from "@/lib/definitions";
import Modal from "@/components/modal";

type CreateCustomerModalProps = {
  initialPhone: string;
  onCancel: () => void;
  onCreated: (customer: Customer) => void;
};

export default function CreateCustomerModal({
  initialPhone,
  onCancel,
  onCreated,
}: CreateCustomerModalProps) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState(initialPhone);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [inactiveCustomerId, setInactiveCustomerId] = useState<string | null>(null);

  const handler: SubmitEventHandler = async (e) => {
    e.preventDefault();

    const normalizedPhone = normalizePhoneNumber(phone);
    if (!normalizedPhone) {
      setError("El teléfono no tiene un formato válido.");
      return;
    }

    setSubmitting(true);
    setError(null);
    setInactiveCustomerId(null);

    const newCustomer = {
      name,
      phone: normalizedPhone,
    }
    const result = await createCustomer(newCustomer);
    if (result.ok) {
      onCreated(result.data);
      return;
    }
    setError(result.error);
    if (result.code === "INACTIVE_CUSTOMER" && result.customerId) {
      setInactiveCustomerId(result.customerId);
    }
    setSubmitting(false);
  }

  const handleReactivate = async () => {
    if (!inactiveCustomerId) return;
    setSubmitting(true);
    const result = await reactivateCustomer(inactiveCustomerId);
    if (result.ok) {
      onCreated(result.data);
      return;
    }
    setError(result.error);
    setSubmitting(false);
  }

  return (
    <Modal onCloseAction={onCancel} labelledBy="create-customer-title" className="w-full max-w-sm rounded-3xl bg-cream p-6 flex flex-col gap-5">
      <div className="flex items-center justify-between">
        <h2 id="create-customer-title" className="text-2xl font-bold text-ink">Nuevo cliente</h2>
        <button
          onClick={onCancel}
          className="rounded-full p-2 hover:bg-ink/5 transition-colors"
          aria-label="Cerrar"
        >
          <X className="h-5 w-5 text-ink-soft" />
        </button>
      </div>

      <form onSubmit={handler} className="flex flex-col gap-4">
        <label className="flex flex-col gap-2">
          <span className="text-lg text-ink-soft">Nombre</span>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            placeholder="Ej: Marcos Gimenez"
            className="rounded-xl border border-ink/15 bg-cream-dark/30 px-4 py-3 text-xl text-ink placeholder:text-ink-soft/70 outline-none focus:border-amber"
          />
        </label>

        <label className="flex flex-col gap-2">
          <span className="text-lg text-ink-soft">Teléfono</span>
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            required
            placeholder="Ej: 3462 455123"
            className="rounded-xl border border-ink/15 bg-cream-dark/30 px-4 py-3 text-xl text-ink placeholder:text-ink-soft/70 outline-none focus:border-amber"
          />
        </label>

        {error && <p className="text-lg text-rust-dark">{error}</p>}

        {inactiveCustomerId ? (
          <button
            type="button"
            disabled={submitting}
            onClick={handleReactivate}
            className="rounded-2xl bg-amber px-6 py-4 text-xl font-semibold text-cream hover:bg-amber-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? "Reactivando..." : "Reactivar cliente"}
          </button>
        ) : (
          <button
            type="submit"
            disabled={submitting}
            className="rounded-2xl bg-amber px-6 py-4 text-xl font-semibold text-cream hover:bg-amber-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? "Creando..." : "Confirmar"}
          </button>
        )}
      </form>
    </Modal>
  );
}
