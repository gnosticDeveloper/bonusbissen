"use client";

import { updateGrant, UpdateGrantRequest } from "@/app/d/[slug]/administrar-puntos/actions";
import { PointAction } from "@/app/d/types";
import { useModal } from "@/components/modal";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";
import { formatPoints } from "@/lib/helpers/format";
import { SubmitEvent } from "react";

export function UpdateGrantModal({ a, onSucceed }: { a: PointAction; onSucceed?: (a: PointAction) => void }) {
  const { close, runAction } = useModal();

  const handleSubmit = async (e: SubmitEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.target);

    const values: UpdateGrantRequest = {
      points: Math.abs(parseInt(formData.get("points")?.toString() ?? "0")),
      note: formData.get("note")?.toString(),
    };

    const result = await runAction(() => updateGrant(a.id, values), {
      loading: {
        title: "Actualizando puntos",
        description: `Estamos actualizando el movimiento de ${a.userName}.`,
      },
      success: (updated) => ({
        title: "Movimiento actualizado",
        description: `El movimiento de ${formatPoints(updated.amount)} puntos para ${updated.userName} fue actualizado.`,
      }),
      errorTitle: "No pudimos actualizar los puntos",
    });

    if (result.ok) onSucceed?.(result.data);
  };

  return (
    <form onSubmit={handleSubmit} className="grid gap-5">
      <label className="grid gap-2">
        <span className="text-sm font-medium text-foreground">Puntos</span>
        <Input
          name="points"
          required
          defaultValue={a.amount}
          className="h-11 rounded-xl border-border bg-background px-3.5 text-sm shadow-none placeholder:text-foreground/70 focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-foreground/70"
        />
      </label>

      <label className="grid gap-2">
        <span className="text-sm font-medium text-foreground">Nota</span>
        <Textarea
          name="note"
          defaultValue={a.note}
          placeholder="Agrega una nota (opcional)"
          className="min-h-24 resize-none rounded-xl border-border bg-background px-3.5 py-3 text-sm shadow-none placeholder:text-foreground/70 focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-foreground/70"
        />
      </label>

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
