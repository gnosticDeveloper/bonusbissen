"use client";

import { useRef, useState } from "react";
import { AlertCircle, ImagePlus, Loader2, Upload, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";
import { appendRewardFields, isValidImage } from "./helpers";
import { Reward } from "@/lib/types/reward";
import { useModal } from "@/components/modal";
import { editReward } from "@/app/d/[slug]/gestion-recompensas/actions";

interface Props {
  reward: Reward;
}

export function UpdateRewardModal({ reward }: Props) {
  const { close } = useModal();
  const formRef = useRef<HTMLFormElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(reward?.imagePath ?? null);
  const [removeImage, setRemoveImage] = useState(false);

  function handleFileChange(file?: File) {
    if (!file) return;
    if (!isValidImage(file)) {
      setError("Seleccioná un archivo de imagen válido.");
      return;
    }
    setError(null);
    setRemoveImage(false);
    setPreview(URL.createObjectURL(file));
  }

  async function handleSubmit(e: React.SubmitEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    const form = e.currentTarget;
    const data = new FormData(form);
    const title = String(data.get("title") ?? "").trim();
    const costPoints = Number(data.get("costPoints"));
    const discountValue = Number(data.get("discountValue"));
    const image = fileRef.current?.files?.[0];

    if (!title || !Number.isInteger(costPoints) || costPoints <= 0 || !Number.isFinite(discountValue) || discountValue < 0) {
      setError("Revisá el título, los puntos y el valor del descuento.");
      return;
    }

    appendRewardFields(
      data,
      {
        title,
        description: String(data.get("description") ?? ""),
        costPoints,
        discountValue,
      },
      image,
    );

    data.set("removeImage", String(removeImage));
    setPending(true);

    try {
      await editReward(reward.id, data);
      formRef.current?.reset();
      close();
    } catch {
      setError("No se pudo guardar la recompensa. Intentá de nuevo.");
    } finally {
      setPending(false);
    }
  }

  return (
    <form ref={formRef} onSubmit={handleSubmit} className="grid gap-5 text-foreground">
      <label className="grid gap-2">
        <span className="text-sm font-medium">Título</span>
        <Input
          name="title"
          required
          defaultValue={reward?.title ?? ""}
          placeholder="Ej. Café gratis"
          className="h-11 rounded-xl border-border bg-background px-3.5 text-sm shadow-none placeholder:text-muted focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/20"
        />
      </label>

      <label className="grid gap-2">
        <span className="text-sm font-medium">Descripción</span>
        <Textarea
          name="description"
          defaultValue={reward?.description ?? ""}
          placeholder="Contale a tus clientes qué incluye esta recompensa"
          className="min-h-24 resize-none rounded-xl border-border bg-background px-3.5 py-3 text-sm shadow-none placeholder:text-muted focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/20"
        />
      </label>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="grid gap-2">
          <span className="text-sm font-medium">Puntos necesarios</span>
          <div className="relative">
            <Input
              name="costPoints"
              type="number"
              min="1"
              step="1"
              required
              defaultValue={reward?.costPoints ?? ""}
              className="h-11 rounded-xl border-border bg-background px-3.5 pr-16 text-sm shadow-none placeholder:text-muted focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/20"
            />
            <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-xs font-medium text-muted">puntos</span>
          </div>
        </label>

        <label className="grid gap-2">
          <span className="text-sm font-medium">Valor del descuento</span>
          <div className="relative">
            <Input
              name="discountValue"
              type="number"
              min="0"
              step="0.01"
              required
              defaultValue={reward?.discountValue ?? ""}
              className="h-11 rounded-xl border-border bg-background px-3.5 pr-10 text-sm shadow-none placeholder:text-muted focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/20"
            />
            <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-xs font-medium text-muted">%</span>
          </div>
        </label>
      </div>

      <div className="grid gap-2">
        <div>
          <p className="text-sm font-medium">Imagen de la recompensa</p>
          <p className="mt-1 text-xs leading-4 text-muted">Podés mantener la actual, reemplazarla o eliminarla.</p>
        </div>

        <input
          ref={fileRef}
          name="image"
          type="file"
          accept="image/*"
          className="sr-only"
          onChange={(event) => handleFileChange(event.target.files?.[0])}
        />

        {preview ? (
          <div className="relative overflow-hidden rounded-2xl border border-border bg-background">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={preview} alt="Vista previa de la recompensa" className="h-44 w-full object-cover" />

            <button
              type="button"
              onClick={() => {
                setPreview(null);
                setRemoveImage(true);
                if (fileRef.current) fileRef.current.value = "";
              }}
              aria-label="Quitar imagen"
              className="absolute right-3 top-3 grid h-9 w-9 place-items-center rounded-full bg-foreground/80 text-primary-foreground shadow-sm transition-colors hover:bg-foreground"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="flex min-h-36 flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-border bg-background px-5 text-center transition-colors hover:border-primary hover:bg-primary/5"
          >
            <span className="grid h-11 w-11 place-items-center rounded-2xl bg-primary/10 text-primary">
              <ImagePlus className="h-5 w-5" aria-hidden="true" />
            </span>
            <span>
              <span className="block text-sm font-semibold">{removeImage ? "Imagen eliminada" : "Subir una imagen"}</span>
              <span className="mt-1 block text-xs text-muted">JPG, PNG o WEBP</span>
            </span>
          </button>
        )}

        {preview ? (
          <Button
            type="button"
            variant="outline"
            onClick={() => fileRef.current?.click()}
            className="h-10 rounded-xl border-border bg-card text-sm text-foreground hover:bg-background"
          >
            <Upload data-icon="inline-start" className="h-4 w-4" />
            Cambiar imagen
          </Button>
        ) : null}

        <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-border bg-background px-3.5 py-3 text-xs text-muted transition-colors hover:border-primary/50">
          <input
            type="checkbox"
            checked={removeImage}
            onChange={(event) => {
              setRemoveImage(event.target.checked);
              if (event.target.checked) {
                setPreview(null);
                if (fileRef.current) fileRef.current.value = "";
              }
            }}
            className="h-4 w-4 accent-primary"
          />
          Eliminar imagen actual
        </label>
      </div>

      {error ? (
        <div role="alert" className="flex items-start gap-3 rounded-xl border border-primary/25 bg-primary/10 px-3.5 py-3 text-sm text-foreground">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
          <p>{error}</p>
        </div>
      ) : null}

      <div className="flex flex-col-reverse gap-2 border-t border-border pt-5 sm:flex-row sm:justify-end">
        <Button
          type="button"
          variant="outline"
          onClick={close}
          disabled={pending}
          className="h-11 rounded-xl border-border bg-card text-sm text-foreground hover:bg-background"
        >
          Cancelar
        </Button>

        <Button
          type="submit"
          disabled={pending}
          className="h-11 rounded-xl bg-primary text-sm font-semibold text-primary-foreground shadow-sm transition-transform hover:bg-primary/90 active:scale-[0.99] disabled:pointer-events-none disabled:opacity-60"
        >
          {pending ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              Guardando...
            </>
          ) : (
            "Guardar cambios"
          )}
        </Button>
      </div>
    </form>
  );
}
