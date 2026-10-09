"use client";

import { updateGrant, UpdateGrantRequest } from "@/app/d/[slug]/administrar-puntos/actions";
import { PointAction } from "@/app/d/types";
import { useModal } from "@/components/modal";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";
import { formatPoints } from "@/lib/helpers/format";
import { SubmitEvent, useState } from "react";

export function UpdateGrantModal({ a, onSucceed }: { a: PointAction; onSucceed?: (a: PointAction) => void }) {
  const { close, open, runAction } = useModal();
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: SubmitEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.target);

    const rawPoints = formData.get("points")?.toString().trim() ?? "";
    const points = /^-?\d+$/.test(rawPoints) ? Number(rawPoints) : NaN;
    const note = formData.get("note")?.toString().trim() ?? "";
    if (!Number.isSafeInteger(points) || Math.abs(points) > 2147483647 || !note) {
      setError("Ingresá una cantidad entera y explicá por qué se corrigen los puntos.");
      return;
    }
    setError(null);
    const values: UpdateGrantRequest = { points, note };

    async function submitCorrection(allowDebt = false) {
      const result = await updateGrant(a.id, { ...values, allowDebt });
      if (!result.ok && result.status === 409 && !allowDebt && result.error.includes("allowDebt")) {
        open(
          <div className="grid gap-4">
            <p className="text-sm">{result.error}</p>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={close}>Cancelar</Button>
              <Button type="button" onClick={() => void submitCorrection(true)}>Confirmar deuda</Button>
            </div>
          </div>,
          { title: "Saldo insuficiente", description: "Esta corrección dejaría al cliente con una deuda." },
        );
        return;
      }
      const shown = await runAction(async () => result, {
        loading: {
          title: "Corrigiendo puntos",
          description: `Estamos registrando una corrección para ${a.userName}.`,
        },
        success: (updated) => ({
          title: "Corrección registrada",
          description: `Se registró un ajuste de ${formatPoints(updated.amount)} puntos para ${updated.userName}.`,
        }),
        errorTitle: "No pudimos corregir los puntos",
      });
      if (shown.ok) onSucceed?.(shown.data);
    }
    await submitCorrection();
  };

  return (
    <form onSubmit={handleSubmit} className="grid gap-5">
      <label className="grid gap-2">
        <span className="text-sm font-medium text-foreground">Cantidad correcta del movimiento</span>
        <Input
          name="points"
          type="number"
          step="1"
          required
          defaultValue={a.effectiveAmount}
          className="h-11 rounded-xl border-border bg-background px-3.5 text-sm shadow-none placeholder:text-foreground/70 focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-foreground/70"
        />
      </label>

      <label className="grid gap-2">
        <span className="text-sm font-medium text-foreground">Motivo de la corrección (obligatorio)</span>
        <Textarea
          name="note"
          required
          placeholder="Explicá por qué se corrige el movimiento"
          className="min-h-24 resize-none rounded-xl border-border bg-background px-3.5 py-3 text-sm shadow-none placeholder:text-foreground/70 focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-foreground/70"
        />
      </label>

      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      <div className="flex flex-col-reverse gap-2 border-t border-border pt-5 sm:flex-row sm:justify-end">
        <Button
          type="button"
          variant="outline"
          onClick={close}
          className="h-11 rounded-xl border-border bg-card text-sm text-foreground hover:bg-background"
        >
          Cancelar
        </Button>
        <Button
          type="submit"
          className="h-11 rounded-xl bg-primary text-sm font-semibold text-primary-foreground shadow-sm transition-transform hover:bg-primary/90 active:scale-[0.99] disabled:pointer-events-none disabled:opacity-60"
        >
          Confirmar
        </Button>
      </div>
    </form>
  );
}
