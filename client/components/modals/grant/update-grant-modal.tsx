"use client";

import { updateGrant, UpdateGrantRequest } from "@/app/d/[slug]/administrar-puntos/actions";
import { PointAction } from "@/app/d/types";
import { useModal } from "@/components/modal";
import { Spinner } from "@/components/spinner";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";
import { SubmitEvent, useState } from "react";

export function UpdateGrantModal({ a, onSucceed }: { a: PointAction; onSucceed?: (a: PointAction) => void }) {
  const { close } = useModal();
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: SubmitEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);

    const formData = new FormData(e.target);

    const values: UpdateGrantRequest = {
      points: Math.abs(parseInt(formData.get("points")?.toString() ?? "0")),
      note: formData.get("note")?.toString(),
    };

    try {
      const res = await updateGrant(a.id, values);

      if (res.ok) {
        onSucceed?.(res.data);
        close();
        return;
      }
    } catch {
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="grid gap-5">
      <label className="grid gap-2">
        <span className="text-sm font-medium text-foreground">Puntos</span>
        <Input
          name="points"
          required
          defaultValue={a.amount}
          className="h-11 rounded-xl border-border bg-background px-3.5 text-sm shadow-none placeholder:text-muted focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/20"
        />
      </label>

      <label className="grid gap-2">
        <span className="text-sm font-medium text-foreground">Nota</span>
        <Textarea
          name="note"
          defaultValue={a.note}
          placeholder="Agrega una nota (opcional)"
          className="min-h-24 resize-none rounded-xl border-border bg-background px-3.5 py-3 text-sm shadow-none placeholder:text-muted focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/20"
        />
      </label>

      <div className="flex flex-col-reverse gap-2 border-t border-border pt-5 sm:flex-row sm:justify-end">
        <Button
          type="button"
          variant="outline"
          onClick={close}
          disabled={loading}
          className="h-11 rounded-xl border-border bg-card text-sm text-foreground hover:bg-background"
        >
          Cancelar
        </Button>
        <Button
          type="submit"
          disabled={loading}
          className="h-11 rounded-xl bg-primary text-sm font-semibold text-primary-foreground shadow-sm transition-transform hover:bg-primary/90 active:scale-[0.99] disabled:pointer-events-none disabled:opacity-60"
        >
          {loading ? (
            <>
              <Spinner />
              Guardando...
            </>
          ) : (
            "Confirmar"
          )}
        </Button>
      </div>
    </form>
  );
}
