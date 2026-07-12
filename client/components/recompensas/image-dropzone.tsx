"use client";

import { useState, useRef } from "react";
import { ImagePlus, X } from "lucide-react";

// Max file size cap to 2MB in order to not overload the server.
const MAX_BYTES = 2 * 1024 * 1024;

type ImageDropzoneProps = {
  value: string | null;
  onChangeAction: (base64: string | null) => void;
};

export default function ImageDropzone({ value, onChangeAction: onChange }: ImageDropzoneProps) {
  const [arrastrando, setArrastrando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  function procesarArchivo(file: File | undefined) {
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
    const reader = new FileReader();
    reader.onload = () => onChange(reader.result as string);
    reader.readAsDataURL(file);
  }

  return (
    <div className="flex flex-col gap-2">
      <span className="text-lg text-ink-soft">Imagen (opcional)</span>

      {value ? (
        <div className="relative rounded-xl overflow-hidden border border-ink/15">
          <img src={value} alt="Vista previa" className="w-full h-40 object-cover" />
          <button
            type="button"
            onClick={() => {
              onChange(null);
              if (inputRef.current) inputRef.current.value = "";
            }}
            className="absolute top-2 right-2 rounded-full bg-ink/70 p-1.5 hover:bg-ink/90 transition-colors"
            aria-label="Quitar imagen"
          >
            <X className="h-4 w-4 text-cream" />
          </button>
        </div>
      ) : (
        <label
          onDragOver={(e) => {
            e.preventDefault();
            setArrastrando(true);
          }}
          onDragLeave={() => setArrastrando(false)}
          onDrop={(e) => {
            e.preventDefault();
            setArrastrando(false);
            procesarArchivo(e.dataTransfer.files?.[0]);
          }}
          className={`flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed px-4 py-8 cursor-pointer transition-colors ${
            arrastrando ? "border-amber bg-amber/10" : "border-ink/20 bg-cream hover:bg-cream-dark/30"
          }`}
        >
          <ImagePlus className="h-7 w-7 text-ink-soft" />
          <p className="text-lg text-ink-soft text-center">Arrastrá una imagen o hacé click para elegir una</p>
          <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={(e) => procesarArchivo(e.target.files?.[0])} />
        </label>
      )}

      {error && <p className="text-base text-rust-dark">{error}</p>}
    </div>
  );
}
