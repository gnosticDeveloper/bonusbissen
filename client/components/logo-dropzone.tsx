"use client";

import { ImagePlus, Pencil, X } from "lucide-react";
import Image from "next/image";
import { useRef, useState } from "react";

interface LogoDropzoneProps {
  initialLogoUrl: string | null;
}

const MAX_BYTES = 1 * 1024 * 1024;

export default function LogoDropzone({ initialLogoUrl = null }: LogoDropzoneProps) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(initialLogoUrl);
  const [hasNewFile, setHasNewFile] = useState(false);
  const [removed, setRemoved] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  function processFile(file: File | undefined) {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("Solo se aceptan archivos de imagen.");
      return;
    }
    if (file.size > MAX_BYTES) {
      setError("La imagen pesa demasiado. Máximo 1MB.");
      return;
    }
    setError(null);
    setRemoved(false);
    setHasNewFile(true);
    setPreviewUrl(URL.createObjectURL(file));
  }

  function handleRemove() {
    setPreviewUrl(null);
    setHasNewFile(false);
    setRemoved(true);
    setError(null);
    if (inputRef.current) inputRef.current.value = "";
  }

  function openPicker() {
    inputRef.current?.click();
  }

  return (
    <div className="flex flex-col gap-2">
      <span className="text-lg text-muted-foreground">Logo (opcional)</span>

      {/* Siempre montado, solo oculto visualmente. El name condicional es
          lo que hace que "no toqué nada" no mande ningún campo "logo". */}
      <input
        ref={inputRef}
        type="file"
        name={hasNewFile ? "logo" : undefined}
        accept="image/*"
        className="hidden"
        onChange={(e) => processFile(e.target.files?.[0])}
      />

      {previewUrl ? (
        <div className="relative aspect-square w-full max-w-40 rounded-lg overflow-hidden border border-border">
          <Image width={160} height={160} src={previewUrl} alt="Vista previa del logo" className="w-full h-full object-cover" />
          <div className="absolute top-2 right-2 flex gap-1.5">
            <button
              type="button"
              onClick={openPicker}
              className="rounded-full bg-foreground/70 p-1.5 hover:bg-foreground/90 transition-colors"
              aria-label="Cambiar logo"
            >
              <Pencil className="h-4 w-4 text-background" />
            </button>
            <button
              type="button"
              onClick={handleRemove}
              className="rounded-full bg-foreground/70 p-1.5 hover:bg-foreground/90 transition-colors"
              aria-label="Quitar logo"
            >
              <X className="h-4 w-4 text-background" />
            </button>
          </div>
        </div>
      ) : (
        <div
          onClick={openPicker}
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragging(false);
            processFile(e.dataTransfer.files?.[0]);
          }}
          className={`flex aspect-square w-full max-w-40 flex-col items-center justify-center gap-1.5 rounded-lg border-2 border-dashed p-3 cursor-pointer transition-colors ${
            dragging ? "border-primary bg-primary/10" : "border-border bg-muted hover:bg-accent"
          }`}
        >
          <ImagePlus className="h-6 w-6 text-muted-foreground" />
          <p className="text-sm text-muted-foreground text-center leading-tight">Arrastrá o hacé click</p>
        </div>
      )}

      {/* Presente solo si el dueño tocó "quitar", ausente en cualquier
          otro caso, incluido "no toqué nada". */}
      {removed && <input type="hidden" name="removeLogo" value="true" />}

      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
