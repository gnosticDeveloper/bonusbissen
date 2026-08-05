"use client";

import { useRef, useState } from "react";
import { Plus } from "lucide-react";
import ImageDropzone from "@/components/recompensas/image-dropzone";
import Form from "next/form";
import { createReward } from "@/app/rewards.actions";
import { EmployeeRole, useAuth } from "@/providers/auth-provider";

export default function CreateRewardForm() {
  const employee = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  if (!employee) return null;

  const isAdmin = employee.type === "employee" && employee.user?.role === EmployeeRole.ADMIN;

  if (!isAdmin) return null;

  const handleSubmit = async (formData: FormData) => {
    setError(null);
    setSubmitting(true);
    const result = await createReward(formData);
    if (result.ok) {
      formRef.current?.reset();
    } else {
      setError(result.error);
    }
    setSubmitting(false);
  };

  return (
    <Form ref={formRef} action={handleSubmit} className="col-span-1 rounded-2xl border border-ink/10 bg-cream-dark/30 p-6 flex flex-col gap-5 sticky top-10">
      <h3 className="text-2xl font-bold text-ink">Nueva recompensa</h3>

      <label className="flex flex-col gap-2">
        <span className="text-lg text-ink-soft">Título de la recompensa</span>
        <input
          type="text"
          name="title"
          required
          placeholder="Ej: 10% off en Pizza Margherita"
          className="rounded-xl border border-ink/15 bg-cream px-4 py-3 text-xl text-ink placeholder:text-ink-soft/70 outline-none focus:border-amber"
        />
      </label>

      <ImageDropzone />

      <label className="flex flex-col gap-2">
        <span className="text-lg text-ink-soft">Descripción</span>
        <textarea
          name="description"
          rows={3}
          placeholder="Ej: Descuento aplicable al pagar en caja."
          className="rounded-xl border border-ink/15 bg-cream px-4 py-3 text-xl text-ink placeholder:text-ink-soft/70 outline-none focus:border-amber resize-none"
        />
      </label>

      <label className="flex flex-col gap-2">
        <span className="text-lg text-ink-soft">Puntos que cuesta</span>
        <input
          name="costPoints"
          type="number"
          min={1}
          required
          placeholder="Ej: 100"
          className="rounded-xl border border-ink/15 bg-cream px-4 py-3 text-xl text-ink placeholder:text-ink-soft/70 outline-none focus:border-amber"
        />
      </label>

      <label className="flex flex-col gap-2">
        <span className="text-lg text-ink-soft">Descuento aplicado (100% = producto gratis)</span>
        <div className="relative">
          <input
            name="discountValue"
            type="number"
            min={1}
            max={100}
            placeholder="Ej: 10"
            className="w-full rounded-xl border border-ink/15 bg-cream px-4 py-3 text-xl text-ink placeholder:text-ink-soft/70 outline-none focus:border-amber pr-10"
          />
          <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xl text-ink-soft">%</span>
        </div>
      </label>

      {error && <p className="text-lg text-rust-dark">{error}</p>}

      <button
        type="submit"
        disabled={submitting}
        className="flex items-center justify-center gap-2 rounded-xl bg-amber px-6 py-3 text-xl font-medium text-cream hover:bg-amber-dark transition-colors disabled:opacity-50"
      >
        <Plus className="h-5 w-5" />
        {submitting ? "Creando..." : "Crear recompensa"}
      </button>
    </Form>
  );
}
