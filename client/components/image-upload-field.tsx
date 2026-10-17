"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Camera, ImagePlus } from "lucide-react";
import type { ActionResult } from "@/lib/api";
import { IMAGE_ACCEPT, validateImageUpload } from "@/lib/image-upload";

type Props = {
  label: string;
  initialUrl?: string | null;
  shape?: "avatar" | "square" | "banner";
  hideLabel?: boolean;
  showHint?: boolean;
  upload: (data: FormData) => Promise<ActionResult<string | null>>;
};

export function ImageUploadField({ label, initialUrl, shape = "square", hideLabel = false, showHint = true, upload }: Props) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [savedUrl, setSavedUrl] = useState<string | null>(initialUrl ?? null);
  const [error, setError] = useState<string | null>(null);
  const [state, setState] = useState<"idle" | "uploading" | "saved">("idle");

  useEffect(() => {
    setSavedUrl(initialUrl ?? null);
  }, [initialUrl]);

  async function chooseFile(selected?: File) {
    if (!selected || state === "uploading") return;
    setState("idle");
    const validationError = validateImageUpload(selected);
    if (validationError) {
      setError(validationError);
      if (inputRef.current) inputRef.current.value = "";
      return;
    }

    const objectUrl = URL.createObjectURL(selected);
    setPreview(objectUrl);
    setError(null);
    setState("uploading");
    const data = new FormData();
    data.set("image", selected);

    try {
      const result = await upload(data);
      if (!result.ok) {
        setError(result.error);
        setState("idle");
        return;
      }
      if (result.data) setSavedUrl(result.data);
      setState("saved");
      router.refresh();
    } catch {
      setError("No pudimos subir la imagen. Intentá de nuevo.");
      setState("idle");
    } finally {
      setPreview(null);
      URL.revokeObjectURL(objectUrl);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  const imageUrl = preview ?? savedUrl;
  const shapeClass = shape === "avatar" ? "mx-auto size-24 rounded-full" : shape === "banner" ? "aspect-3/1 min-h-28 w-full rounded-xl" : "size-28 rounded-xl";

  return (
    <div className="min-w-0 space-y-2">
      <p className={hideLabel ? "sr-only" : "text-sm font-medium text-foreground"}>{label}</p>
      <button
        type="button"
        aria-label={`${imageUrl ? "Cambiar" : "Seleccionar"} ${label.toLowerCase()}`}
        aria-busy={state === "uploading"}
        disabled={state === "uploading"}
        onClick={() => inputRef.current?.click()}
        className={`group relative grid place-items-center overflow-hidden border border-border bg-background text-foreground shadow-sm transition-opacity hover:opacity-85 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:cursor-wait ${shapeClass}`}
      >
        {imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={imageUrl} alt="" className="size-full object-cover" />
        ) : (
          <ImagePlus className="size-6 text-foreground/60" aria-hidden="true" />
        )}
        <span className="absolute inset-0 grid place-items-center bg-black/45 text-white opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">
          <Camera className="size-5" aria-hidden="true" />
        </span>
      </button>
      <input
        ref={inputRef}
        type="file"
        accept={IMAGE_ACCEPT}
        tabIndex={-1}
        hidden
        onChange={(event) => void chooseFile(event.target.files?.[0])}
      />
      {showHint && <p className="text-xs text-foreground/75">WEBP, JPG, JPEG o PNG · máximo 2 MB.</p>}
      {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
      {state === "uploading" && <p role="status" className="text-xs text-foreground/75">Subiendo imagen...</p>}
      {state === "saved" && <p role="status" className="text-xs text-foreground/75">Imagen actualizada.</p>}
    </div>
  );
}
