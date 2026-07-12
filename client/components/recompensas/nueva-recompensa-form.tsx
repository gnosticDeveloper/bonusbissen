"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import type { NuevaRecompensaInput } from "@/app/actions";
import ImageDropzone from "@/components/recompensas/image-dropzone";

type NuevaRecompensaFormProps = {
  onCrear: (input: NuevaRecompensaInput) => void;
};

export default function NuevaRecompensaForm({ onCrear }: NuevaRecompensaFormProps) {
  const [nombre, setNombre] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [costoPuntos, setCostoPuntos] = useState("");
  const [descuentoPorcentaje, setDescuentoPorcentaje] = useState("");
  const [imagenBase64, setImagenBase64] = useState<string | null>(null);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!nombre || !costoPuntos || !descuentoPorcentaje) return;

    onCrear({
      nombre,
      descripcion,
      costoPuntos: Number(costoPuntos),
      descuentoPorcentaje: Number(descuentoPorcentaje),
      imagenBase64,
    });

    setNombre("");
    setDescripcion("");
    setCostoPuntos("");
    setDescuentoPorcentaje("");
    setImagenBase64(null);
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-2xl border border-ink/10 bg-cream-dark/30 p-6 flex flex-col gap-5 sticky top-10">
      <h3 className="text-2xl font-bold text-ink">Nueva recompensa</h3>

      <label className="flex flex-col gap-2">
        <span className="text-lg text-ink-soft">Título de la recompensa</span>
        <input
          type="text"
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          required
          placeholder="Ej: 10% off en Pizza Margherita"
          className="rounded-xl border border-ink/15 bg-cream px-4 py-3 text-xl text-ink placeholder:text-ink-soft/70 outline-none focus:border-amber"
        />
      </label>

      <ImageDropzone value={imagenBase64} onChangeAction={setImagenBase64} />

      <label className="flex flex-col gap-2">
        <span className="text-lg text-ink-soft">Descripción</span>
        <textarea
          value={descripcion}
          onChange={(e) => setDescripcion(e.target.value)}
          rows={3}
          placeholder="Ej: Descuento aplicable al pagar en caja."
          className="rounded-xl border border-ink/15 bg-cream px-4 py-3 text-xl text-ink placeholder:text-ink-soft/70 outline-none focus:border-amber resize-none"
        />
      </label>

      <label className="flex flex-col gap-2">
        <span className="text-lg text-ink-soft">Puntos que cuesta</span>
        <input
          type="number"
          min={1}
          value={costoPuntos}
          onChange={(e) => setCostoPuntos(e.target.value)}
          required
          placeholder="Ej: 100"
          className="rounded-xl border border-ink/15 bg-cream px-4 py-3 text-xl text-ink placeholder:text-ink-soft/70 outline-none focus:border-amber"
        />
      </label>

      <label className="flex flex-col gap-2">
        <span className="text-lg text-ink-soft">Descuento aplicado (100% = producto gratis)</span>
        <div className="relative">
          <input
            type="number"
            min={1}
            max={100}
            value={descuentoPorcentaje}
            onChange={(e) => setDescuentoPorcentaje(e.target.value)}
            required
            placeholder="Ej: 10"
            className="w-full rounded-xl border border-ink/15 bg-cream px-4 py-3 text-xl text-ink placeholder:text-ink-soft/70 outline-none focus:border-amber pr-10"
          />
          <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xl text-ink-soft">%</span>
        </div>
      </label>

      <button
        type="submit"
        className="flex items-center justify-center gap-2 rounded-xl bg-amber px-6 py-3 text-xl font-medium text-cream hover:bg-amber-dark transition-colors"
      >
        <Plus className="h-5 w-5" />
        Crear recompensa
      </button>
    </form>
  );
}
