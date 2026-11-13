"use client";

import { useRef, useState } from "react";
import { Camera, ImagePlus } from "lucide-react";
import type { ActionResult } from "@/lib/demo/types";
import { fileToDataUrl, IMAGE_ACCEPT, validateImageUpload } from "@/lib/image-upload";

type Props = {
  label: string;
  initialUrl?: string | null;
  shape?: "avatar" | "square" | "banner";
  hideLabel?: boolean;
  showHint?: boolean;
  /** Receives the image as a data URL: the demo keeps it in the browser. */
  upload: (dataUrl: string) => Promise<ActionResult<string | null>>;
  maxSide?: number;
};

export function ImageUploadField({ label, initialUrl, shape = "square", hideLabel = false, showHint = true, upload, maxSide }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [savedUrl, setSavedUrl] = useState<string | null>(initialUrl ?? null);
  const [error, setError] = useState<string | null>(null);
  const [state, setState] = useState<"idle" | "uploading" | "saved">("idle");

  // A new `initialUrl` (e.g. after the store changes) replaces the saved image.
  const [prevInitialUrl, setPrevInitialUrl] = useState(initialUrl);
  if (initialUrl !== prevInitialUrl) {
    setPrevInitialUrl(initialUrl);
    setSavedUrl(initialUrl ?? null);
  }

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

    try {
      const dataUrl = await fileToDataUrl(selected, maxSide ?? (shape === "banner" ? 1600 : 600));
      const result = await upload(dataUrl);
      if (!result.ok) {
        setError(result.error);
        setState("idle");
        return;
      }
      if (result.data) setSavedUrl(result.data);
      setState("saved");
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
