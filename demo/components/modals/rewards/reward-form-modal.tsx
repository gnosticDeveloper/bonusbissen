"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { AlertCircle, ImagePlus, Upload, X } from "lucide-react";
import { useModal } from "@/components/modal";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";
import { ModalContentLoader } from "@/components/modals/action-status-modal";
import { createReward, editReward, getActivePrograms, type RewardView } from "@/lib/demo/actions";
import { fileToDataUrl, validateImageUpload } from "@/lib/image-upload";

const fieldClass =
  "h-11 rounded-xl border-border bg-background px-3.5 text-sm shadow-none placeholder:text-foreground/70 focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-foreground/70";

/** Create (`reward` omitted) or edit a reward; the chosen image is stored in the browser as a data URL. */
export function RewardFormModal({ reward, defaultProgramId }: { reward?: RewardView; defaultProgramId?: string | null }) {
  const isEdit = Boolean(reward);
  const { close, runWithStatus } = useModal();
  const [error, setError] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(reward?.imageUrl ?? null);
  const [file, setFile] = useState<File | null>(null);
  const [removeImage, setRemoveImage] = useState(false);
  const [programs, setPrograms] = useState<{ id: string; name: string }[] | null>(isEdit ? [] : null);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    if (isEdit) return;
    let cancelled = false;
    getActivePrograms()
      .then((result) => {
        if (cancelled) return;
        if (result.ok) setPrograms(result.data);
        else setLoadError(true);
      })
      .catch(() => {
        if (!cancelled) setLoadError(true);
      });
    return () => {
      cancelled = true;
    };
  }, [isEdit]);

  function handleFileChange(next?: File) {
    setError(null);
    if (!next) return;
    const errorText = validateImageUpload(next);
    if (errorText) {
      setError(errorText);
      return;
    }
    setFile(next);
    setRemoveImage(false);
    setPreview(URL.createObjectURL(next));
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    const title = String(data.get("title") ?? "").trim();
    const description = String(data.get("description") ?? "");
    const costPoints = Number(data.get("costPoints"));
    const discountValue = Number(data.get("discountValue"));
    const programId = String(data.get("pointProgramId") ?? "");

    if (!title || !Number.isInteger(costPoints) || costPoints <= 0 || !Number.isFinite(discountValue) || discountValue < 0 || (!isEdit && !programId)) {
      setError(isEdit ? "Revisá el título, los puntos y el valor del descuento." : "Revisa el título, los puntos, el valor del descuento y el programa de puntos.");
      return;
    }

    let imageUrl: string | null = null;
    if (file) {
      try {
        imageUrl = await fileToDataUrl(file, 900);
      } catch {
        setError("No pudimos leer la imagen. Probá con otra.");
        return;
      }
    }

    const input = { title, description, costPoints, discountValue, programId, imageUrl, removeImage };
    const result = await runWithStatus(() => (reward ? editReward(reward.id, input) : createReward(input)), {
      loading: isEdit
        ? { title: "Actualizando recompensa", description: `Estamos guardando los cambios de ${title}.` }
        : { title: "Creando recompensa", description: `Estamos agregando ${title} al catálogo.` },
      success: (saved) =>
        isEdit
          ? { title: "Recompensa actualizada", description: `Los cambios de ${saved.title} se guardaron correctamente.` }
          : { title: "Recompensa creada", description: `${saved.title} ya está disponible en el catálogo.` },
      errorTitle: isEdit ? "No pudimos actualizar la recompensa" : "No pudimos crear la recompensa",
    });

    if (result.ok) formRef.current?.reset();
  }

  if (programs === null && !loadError) return <ModalContentLoader label="Cargando programas de puntos…" />;

  if (loadError) {
    return (
      <div role="alert" className="flex items-start gap-3 rounded-xl border border-primary/25 bg-primary/10 px-3.5 py-3 text-sm text-foreground">
        <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-foreground" aria-hidden="true" />
        <p>No pudimos cargar tus programas de puntos. Cerrá este panel e intentá de nuevo.</p>
      </div>
    );
  }

  if (!isEdit && programs!.length === 0) {
    return (
      <div className="flex flex-col items-center gap-4 py-6 text-center">
        <span className="grid h-11 w-11 place-items-center rounded-2xl bg-primary/10 text-foreground">
          <AlertCircle className="h-5 w-5" aria-hidden="true" />
        </span>
        <div>
          <p className="text-sm font-semibold text-foreground">Necesitás un programa de puntos primero</p>
          <p className="mt-1 text-xs leading-5 text-foreground/80">Para crear una recompensa primero creá un programa de puntos en &quot;Mi negocio&quot;.</p>
        </div>
        <Button type="button" variant="outline" onClick={close} className="h-10 rounded-xl border-border bg-card text-sm text-foreground hover:bg-background">
          Entendido
        </Button>
      </div>
    );
  }

  const singleProgram = !isEdit && programs!.length === 1 ? programs![0] : null;

  return (
    <form ref={formRef} onSubmit={handleSubmit} className="grid gap-5 text-foreground">
      <label className="grid gap-2">
        <span className="text-sm font-medium text-foreground">Título</span>
        <Input name="title" required defaultValue={reward?.title ?? ""} placeholder="Ej. Café gratis" className={fieldClass} />
      </label>

      <label className="grid gap-2">
        <span className="text-sm font-medium text-foreground">Descripción</span>
        <Textarea
          name="description"
          defaultValue={reward?.description ?? ""}
          placeholder="Contale a tus clientes qué incluye esta recompensa"
          className="min-h-24 resize-none rounded-xl border-border bg-background px-3.5 py-3 text-sm shadow-none placeholder:text-foreground/70 focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-foreground/70"
        />
      </label>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="grid gap-2">
          <span className="text-sm font-medium text-foreground">Puntos necesarios</span>
          <div className="relative">
            <Input name="costPoints" type="number" min="1" step="1" required defaultValue={reward?.costPoints ?? ""} placeholder="100" className={`${fieldClass} pr-16`} />
            <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-xs font-medium text-foreground/80">puntos</span>
          </div>
        </label>

        <label className="grid gap-2">
          <span className="text-sm font-medium text-foreground">{isEdit ? "Valor del descuento" : "Valor del descuento (entre 1 y 100)"}</span>
          <div className="relative">
            <Input
              name="discountValue"
              type="number"
              min="0"
              max="100"
              step="0.01"
              required
              defaultValue={reward?.discountValue ?? ""}
              placeholder="10"
              className={`${fieldClass} pr-10`}
            />
            <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-xs font-medium text-foreground/80">%</span>
          </div>
        </label>
      </div>

      {!isEdit ? (
        <label className="grid gap-2">
          <span className="text-sm font-medium text-foreground">Programa de puntos</span>
          {singleProgram ? (
            <>
              <input type="hidden" name="pointProgramId" value={singleProgram.id} />
              <div className="flex h-11 items-center rounded-xl border border-border bg-background px-3.5 text-sm text-foreground/80">{singleProgram.name}</div>
            </>
          ) : (
            <select
              name="pointProgramId"
              required
              defaultValue={programs!.some((p) => p.id === defaultProgramId) ? (defaultProgramId ?? "") : ""}
              className="h-11 rounded-xl border border-border bg-background px-3.5 text-sm shadow-none focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-foreground/70"
            >
              <option value="" disabled>
                Elegí un programa
              </option>
              {programs!.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          )}
        </label>
      ) : null}

      <div className="grid gap-2">
        <div>
          <p className="text-sm font-medium text-foreground">Imagen de la recompensa</p>
          <p className="mt-1 text-xs leading-4 text-foreground/80">
            {isEdit ? "Podés mantener la actual, reemplazarla o eliminarla." : "Usá una imagen clara y fácil de reconocer."}
          </p>
        </div>

        <input ref={fileRef} name="image" type="file" accept="image/*" className="sr-only" onChange={(event) => handleFileChange(event.target.files?.[0])} />

        {preview ? (
          <div className="relative overflow-hidden rounded-2xl border border-border bg-background">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={preview} alt="Vista previa de la recompensa" className="h-44 w-full object-cover" />
            {isEdit ? (
              <button
                type="button"
                onClick={() => {
                  setPreview(null);
                  setFile(null);
                  setRemoveImage(true);
                  if (fileRef.current) fileRef.current.value = "";
                }}
                aria-label="Quitar imagen"
                className="absolute right-3 top-3 grid h-9 w-9 place-items-center rounded-full bg-foreground text-background shadow-sm transition-colors hover:bg-foreground/90"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            ) : (
              <div className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-3 bg-foreground/80 px-3 py-2.5 text-background">
                <span className="truncate text-xs font-medium">Imagen seleccionada</span>
                <button
                  type="button"
                  onClick={() => {
                    setPreview(null);
                    setFile(null);
                    if (fileRef.current) fileRef.current.value = "";
                  }}
                  aria-label="Quitar imagen"
                  className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-card/20 transition-colors hover:bg-card/30"
                >
                  <X className="h-4 w-4" aria-hidden="true" />
                </button>
              </div>
            )}
          </div>
        ) : (
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="flex min-h-36 flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-border bg-background px-5 text-center transition-colors hover:border-primary hover:bg-primary/5"
          >
            <span className="grid h-11 w-11 place-items-center rounded-2xl bg-primary/10 text-foreground">
              <ImagePlus className="h-5 w-5" aria-hidden="true" />
            </span>
            <span>
              <span className="block text-sm font-semibold text-foreground">{isEdit ? (removeImage ? "Imagen eliminada" : "Subir una imagen") : "Subir imagen"}</span>
              <span className="mt-1 block text-xs text-foreground/80">JPG, PNG o WEBP</span>
            </span>
          </button>
        )}

        {preview ? (
          <Button type="button" variant="outline" onClick={() => fileRef.current?.click()} className="h-10 rounded-xl border-border bg-card text-sm text-foreground hover:bg-background">
            <Upload data-icon="inline-start" className="h-4 w-4" />
            Cambiar imagen
          </Button>
        ) : null}

        {isEdit ? (
          <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-border bg-background px-3.5 py-3 text-xs text-foreground/80 transition-colors hover:border-primary/50">
            <input
              type="checkbox"
              checked={removeImage}
              onChange={(event) => {
                setRemoveImage(event.target.checked);
                if (event.target.checked) {
                  setPreview(null);
                  setFile(null);
                  if (fileRef.current) fileRef.current.value = "";
                }
              }}
              className="h-4 w-4 accent-primary"
            />
            Eliminar imagen actual
          </label>
        ) : null}
      </div>

      {error ? (
        <div role="alert" className="flex items-start gap-3 rounded-xl border border-primary/25 bg-primary/10 px-3.5 py-3 text-sm text-foreground">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-foreground" aria-hidden="true" />
          <p>{error}</p>
        </div>
      ) : null}

      <div className="flex flex-col-reverse gap-2 border-t border-border pt-5 sm:flex-row sm:justify-end">
        <Button type="button" variant="outline" onClick={close} className="h-11 rounded-xl border-border bg-card text-sm text-foreground hover:bg-background">
          Cancelar
        </Button>
        <Button
          type="submit"
          className="h-11 rounded-xl bg-primary text-sm font-semibold text-primary-foreground shadow-sm transition-transform hover:bg-primary/90 active:scale-[0.99] disabled:pointer-events-none disabled:opacity-60"
        >
          {isEdit ? "Guardar cambios" : "Crear recompensa"}
        </Button>
      </div>
    </form>
  );
}
