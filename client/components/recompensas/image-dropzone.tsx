"use client";

import { useRef, useState } from "react";
import { ImagePlus, X, Pencil } from "lucide-react";
import Image from "next/image";

// Max file size cap to 2MB in order to not overload the server.
const MAX_BYTES = 2 * 1024 * 1024;

type ImageDropzoneProps = {
  initialImageUrl?: string | null;
};

export default function ImageDropzone({ initialImageUrl = null }: ImageDropzoneProps) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(initialImageUrl);
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
      setError("La imagen pesa demasiado. Máximo 2MB.");
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
      <span className="text-lg text-ink-soft">Imagen (opcional)</span>

      {/* Siempre montado, solo oculto visualmente. El name condicional es
          lo que hace que "no toqué nada" no mande ningún campo "image". */}
      <input
        ref={inputRef}
        type="file"
        name={hasNewFile ? "image" : undefined}
        accept="image/*"
        className="hidden"
        onChange={(e) => processFile(e.target.files?.[0])}
      />

      {previewUrl ? (
        <div className="relative rounded-xl overflow-hidden border border-ink/15">
          <Image width={160} height={160} src={previewUrl} alt="Vista previa" className="w-full h-40 object-cover" />
          <div className="absolute top-2 right-2 flex gap-1.5">
            <button
              type="button"
              onClick={openPicker}
              className="rounded-full bg-black/70 p-1.5 hover:bg-ink/90 transition-colors"
              aria-label="Cambiar imagen"
            >
              <Pencil className="h-4 w-4 text-cream" />
            </button>
            <button
              type="button"
              onClick={handleRemove}
              className="rounded-full bg-black/70 p-1.5 hover:bg-ink/90 transition-colors"
              aria-label="Quitar imagen"
            >
              <X className="h-4 w-4 text-cream" />
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
          className={`flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed px-4 py-8 cursor-pointer transition-colors ${
            dragging ? "border-amber bg-amber/10" : "border-ink/20 bg-cream hover:bg-cream-dark/30"
          }`}
        >
          <ImagePlus className="h-7 w-7 text-ink-soft" />
          <p className="text-lg text-ink-soft text-center">Arrastrá una imagen o hacé click para elegir una</p>
        </div>
      )}

      {/* Presente solo si el admin tocó "quitar" — ausente en cualquier
          otro caso, incluido "no toqué nada". El backend, con boolean
          primitivo, lo interpreta como false por default si no llega. */}
      {removed && <input type="hidden" name="removeImage" value="true" />}

      {error && <p className="text-base text-rust-dark">{error}</p>}
    </div>
  );
}
