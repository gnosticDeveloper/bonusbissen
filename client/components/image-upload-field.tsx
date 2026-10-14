"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ImagePlus } from "lucide-react";
import type { ActionResult } from "@/lib/api";
import { IMAGE_ACCEPT, validateImageUpload } from "@/lib/image-upload";


type Props = {
  label: string;
  initialUrl?: string | null;
  shape?: "square" | "banner";
  upload: (data: FormData) => Promise<ActionResult<string | null>>;
};

export function ImageUploadField({ label, initialUrl, shape = "square", upload }: Props) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [savedUrl, setSavedUrl] = useState<string | null>(initialUrl ?? null);
  const [error, setError] = useState<string | null>(null);
  const [state, setState] = useState<"idle" | "uploading" | "saved">("idle");

  useEffect(() => {
    if (!file) return;
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  useEffect(() => {
    setSavedUrl(initialUrl ?? null);
  }, [initialUrl]);

  function chooseFile(selected?: File) {
    if (!selected) return;
    const validationError = validateImageUpload(selected);
    if (validationError) {
      setError(validationError);
      if (inputRef.current) inputRef.current.value = "";
      return;
    }
    setError(null);
    setState("idle");
    setFile(selected);
  }

  async function submit() {
    if (!file || state === "uploading") return;
    const validationError = validateImageUpload(file);
    if (validationError) {
      setError(validationError);
      return;
    }
    setState("uploading");
    setError(null);
    const data = new FormData();
    data.set("image", file);
    try {
      const result = await upload(data);
      if (!result.ok) {
        setError(result.error);
        setState("idle");
        return;
      }
      if (result.data) setSavedUrl(result.data);
      setState("saved");
      setFile(null);
      setPreview(null);
      if (inputRef.current) inputRef.current.value = "";
      router.refresh();
    } catch {
      setError("No pudimos subir la imagen. Intentá de nuevo.");
      setState("idle");
    }
  }

  const imageUrl = preview ?? savedUrl;
  const banner = shape === "banner";

  return (
    <div className="flex flex-col gap-3">
      <div>
        <p className="text-sm font-medium text-foreground">{label}</p>
        <p className="mt-1 text-xs text-foreground/75">WEBP, JPG, JPEG o PNG · máximo 2 MB.</p>
      </div>
      <div className={`flex items-center justify-center overflow-hidden rounded-2xl border border-border bg-background ${banner ? "aspect-3/1 w-full" : "size-24"}`}>
        {imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={imageUrl} alt={`Vista previa: ${label.toLowerCase()}`} className="size-full object-cover" />
        ) : (
          <ImagePlus className="size-7 text-foreground/60" aria-hidden="true" />
        )}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept={IMAGE_ACCEPT}
        aria-label={`Seleccionar ${label.toLowerCase()}`}
        disabled={state === "uploading"}
        onChange={(event) => chooseFile(event.target.files?.[0])}
        className="block w-full text-sm text-foreground file:mr-3 file:rounded-full file:border-0 file:bg-primary/10 file:px-4 file:py-2 file:font-medium file:text-foreground hover:file:bg-primary/20"
      />
      {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
      {state === "saved" && <p role="status" className="text-sm text-foreground">Imagen actualizada correctamente.</p>}
      <button
        type="button"
        disabled={!file || state === "uploading"}
        onClick={() => void submit()}
        className="w-fit rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-60"
      >
        {state === "uploading" ? "Subiendo..." : `Guardar ${label.toLowerCase()}`}
      </button>
    </div>
  );
}
