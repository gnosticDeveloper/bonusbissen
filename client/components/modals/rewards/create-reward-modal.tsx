"use client";

import { useEffect, useRef, useState } from "react";
import { isValidImage } from "./helpers";
import { useModal } from "@/components/modal";
import { Input, Textarea } from "@/components/ui/input";
import { AlertCircle, ImagePlus, Loader2, Upload, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createReward } from "@/app/d/[slug]/gestion-recompensas/actions";
import { getPointPrograms } from "@/app/d/[slug]/(admin-only)/mi-negocio/actions";
import { PointProgram } from "@/lib/types/point-program";
import { useToast } from "@/components/toast";

export function CreateRewardModal() {
  const { close } = useModal();
  const notify = useToast();
  const formRef = useRef<HTMLFormElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [pending, setPending] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);

  const [pointPrograms, setPointPrograms] = useState<PointProgram[] | null>(null);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    getPointPrograms()
      .then((programs) => {
        if (!cancelled) setPointPrograms(programs.filter((p) => p.active));
      })
      .catch(() => {
        if (!cancelled) setLoadError(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  function handleFileChange(file?: File) {
    if (!file) return;
    if (!isValidImage(file)) {
      notify("Selecciona un archivo de imagen válido.", "error");
      return;
    }
    setPreview(URL.createObjectURL(file));
  }

  async function handleSubmit(e: React.SubmitEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const data = new FormData(form);
    const title = String(data.get("title") ?? "").trim();
    const costPoints = Number(data.get("costPoints"));
    const discountValue = Number(data.get("discountValue"));
    const pointProgramId = String(data.get("pointProgramId") ?? "");

    if (!title || !Number.isInteger(costPoints) || costPoints <= 0 || !Number.isFinite(discountValue) || discountValue < 0 || !pointProgramId) {
      notify("Revisa el título, los puntos, el valor del descuento y el programa de puntos.", "error");
      return;
    }

    const image = fileRef.current?.files?.[0];
    if (image && image.size > 0) {
      data.set("image", image);
    }

    setPending(true);
    try {
      await createReward(data);
      formRef.current?.reset();
      close();
    } catch {
      notify("No se pudo guardar la recompensa. Inténtalo de nuevo.", "error");
    } finally {
      setPending(false);
    }
  }

  if (pointPrograms === null && !loadError) {
    return (
      <div className="flex min-h-40 items-center justify-center gap-2 text-sm text-muted">
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
        Cargando programas de puntos…
      </div>
    );
  }

  if (loadError) {
    return (
      <div role="alert" className="flex items-start gap-3 rounded-xl border border-primary/25 bg-primary/10 px-3.5 py-3 text-sm text-foreground">
        <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
        <p>No pudimos cargar tus programas de puntos. Cerrá este panel e intentá de nuevo.</p>
      </div>
    );
  }

  if (pointPrograms!.length === 0) {
    return (
      <div className="flex flex-col items-center gap-4 py-6 text-center">
        <span className="grid h-11 w-11 place-items-center rounded-2xl bg-primary/10 text-primary">
          <AlertCircle className="h-5 w-5" aria-hidden="true" />
        </span>
        <div>
          <p className="text-sm font-semibold text-foreground">Necesitás un programa de puntos primero</p>
          <p className="mt-1 text-xs leading-5 text-muted">Para crear una recompensa primero creá un programa de puntos en "Mi negocio".</p>
        </div>
        <Button
          type="button"
          variant="outline"
          onClick={close}
          className="h-10 rounded-xl border-border bg-card text-sm text-foreground hover:bg-background"
        >
          Entendido
        </Button>
      </div>
    );
  }

  const singleProgram = pointPrograms!.length === 1 ? pointPrograms![0] : null;

  return (
    <form ref={formRef} onSubmit={handleSubmit} className="grid gap-5">
      <label className="grid gap-2">
        <span className="text-sm font-medium text-foreground">Título</span>
        <Input
          name="title"
          required
          placeholder="Ej. Café gratis"
          className="h-11 rounded-xl border-border bg-background px-3.5 text-sm shadow-none placeholder:text-muted focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/20"
        />
      </label>

      <label className="grid gap-2">
        <span className="text-sm font-medium text-foreground">Descripción</span>
        <Textarea
          name="description"
          placeholder="Contale a tus clientes qué incluye esta recompensa"
          className="min-h-24 resize-none rounded-xl border-border bg-background px-3.5 py-3 text-sm shadow-none placeholder:text-muted focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/20"
        />
      </label>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="grid gap-2">
          <span className="text-sm font-medium text-foreground">Puntos necesarios</span>
          <div className="relative">
            <Input
              name="costPoints"
              type="number"
              min="1"
              step="1"
              required
              placeholder="100"
              className="h-11 rounded-xl border-border bg-background px-3.5 pr-16 text-sm shadow-none placeholder:text-muted focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/20"
            />
            <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-xs font-medium text-muted">puntos</span>
          </div>
        </label>

        <label className="grid gap-2">
          <span className="text-sm font-medium text-foreground">Valor del descuento (entre 1 y 100)</span>
          <div className="relative">
            <Input
              name="discountValue"
              type="number"
              min="0"
              step="0.01"
              required
              placeholder="10"
              className="h-11 rounded-xl border-border bg-background px-3.5 pr-10 text-sm shadow-none placeholder:text-muted focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/20"
            />
            <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-xs font-medium text-muted">%</span>
          </div>
        </label>
      </div>

      <label className="grid gap-2">
        <span className="text-sm font-medium text-foreground">Programa de puntos</span>
        {singleProgram ? (
          <>
            <input type="hidden" name="pointProgramId" value={singleProgram.id} />
            <div className="flex h-11 items-center rounded-xl border border-border bg-background px-3.5 text-sm text-muted">{singleProgram.name}</div>
          </>
        ) : (
          <select
            name="pointProgramId"
            required
            defaultValue=""
            className="h-11 rounded-xl border border-border bg-background px-3.5 text-sm shadow-none focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/20"
          >
            <option value="" disabled>
              Elegí un programa
            </option>
            {pointPrograms!.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        )}
      </label>

      <div className="grid gap-2">
        <div>
          <p className="text-sm font-medium text-foreground">Imagen de la recompensa</p>
          <p className="mt-1 text-xs leading-4 text-muted">Usá una imagen clara y fácil de reconocer.</p>
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
            <img src={preview} alt="Vista previa de la recompensa" className="h-44 w-full object-cover" />
            <div className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-3 bg-foreground/80 px-3 py-2.5 text-background">
              <span className="truncate text-xs font-medium">Imagen seleccionada</span>
              <button
                type="button"
                onClick={() => {
                  setPreview(null);
                  if (fileRef.current) fileRef.current.value = "";
                }}
                aria-label="Quitar imagen"
                className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-card/20 transition-colors hover:bg-card/30"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
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
              <span className="block text-sm font-semibold text-foreground">Subir imagen</span>
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
      </div>

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
            "Crear recompensa"
          )}
        </Button>
      </div>
    </form>
  );
}
