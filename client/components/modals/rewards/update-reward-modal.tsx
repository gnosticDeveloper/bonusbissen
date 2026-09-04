"use client";

import { useRef, useState } from "react";
import { ImagePlus, Loader2, Upload, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";
import { appendRewardFields, isValidImage } from "./helpers";
import { Reward } from "@/lib/types/reward";
import { useModal } from "@/components/modal";
import { editReward } from "@/app/[orgId]/(employee)/dashboard/rewards/actions";

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
      setError("Selecciona un archivo de imagen válido.");
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
      setError("Revisa el título, los puntos y el valor del descuento.");
      return;
    }
    appendRewardFields(data, { title, description: String(data.get("description") ?? ""), costPoints, discountValue }, image);
    data.set("removeImage", String(removeImage));
    setPending(true);
    try {
      await editReward(reward.id, data);
      formRef.current?.reset();
      close();
    } catch {
      setError("No se pudo guardar la recompensa. Inténtalo de nuevo.");
    } finally {
      setPending(false);
    }
  }
  return (
    <form ref={formRef} onSubmit={handleSubmit} className="flex flex-col gap-4">
      <label>
        Título
        <Input name="title" required defaultValue={reward?.title ?? ""} />
      </label>
      <label>
        Descripción
        <Textarea name="description" defaultValue={reward?.description ?? ""} />
      </label>
      <div className="grid gap-4 sm:grid-cols-2">
        <label>
          Puntos necesarios
          <Input name="costPoints" type="number" min="1" step="1" required defaultValue={reward?.costPoints ?? ""} />
        </label>
        <label>
          Valor del descuento
          <Input name="discountValue" type="number" min="0" step="0.01" required defaultValue={reward?.discountValue ?? ""} />
        </label>
      </div>
      <div className="flex flex-col gap-2">
        <span>Imagen</span>
        <input ref={fileRef} name="image" type="file" accept="image/*" className="sr-only" onChange={(e) => handleFileChange(e.target.files?.[0])} />
        {preview ? (
          <div className="relative">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={preview} alt="Vista previa" className="h-36 w-full rounded-xl object-cover" />
            <button
              type="button"
              onClick={() => {
                setPreview(null);
                setRemoveImage(true);
                if (fileRef.current) fileRef.current.value = "";
              }}
              aria-label="Quitar imagen"
            >
              <X />
            </button>
          </div>
        ) : (
          <button type="button" onClick={() => fileRef.current?.click()}>
            {" "}
            <ImagePlus />
            Subir imagen
          </button>
        )}
        {preview && (
          <Button type="button" variant="outline" onClick={() => fileRef.current?.click()}>
            <Upload data-icon="inline-start" />
            Cambiar imagen
          </Button>
        )}
        <label>
          <input
            type="checkbox"
            checked={removeImage}
            onChange={(e) => {
              setRemoveImage(e.target.checked);
              if (e.target.checked) setPreview(null);
            }}
          />{" "}
          Eliminar imagen actual
        </label>
      </div>
      {error && <p role="alert">{error}</p>}
      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={close} disabled={pending}>
          Cancelar
        </Button>
        <Button type="submit" disabled={pending}>
          {pending && <Loader2 className="animate-spin" />}
          Guardar cambios
        </Button>
      </div>
    </form>
  );
}
