"use client";

import { useEffect, useState } from "react";
import { Download, QrCode } from "lucide-react";
import { generateQRCode } from "@/lib/helpers/qr-code";

type QRPreview = { storefrontId: string; url: string; image: string } | { storefrontId: string; error: string } | null;

export function QRCodePreview({ storefrontId }: { storefrontId: string }) {
  const [qr, setQr] = useState<QRPreview>(null);
  const [format, setFormat] = useState<"png" | "svg">("png");
  const [downloading, setDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState<string | null>(null);

  useEffect(() => {
    const url = new URL(`/s/${encodeURIComponent(storefrontId)}/afiliarse`, window.location.origin).toString();
    try {
      setQr({ storefrontId, url, image: generateQRCode(url) });
    } catch {
      setQr({ storefrontId, error: "No pudimos generar el código QR para este local." });
    }
  }, [storefrontId]);

  const currentQr = qr?.storefrontId === storefrontId ? qr : null;

  async function handleDownload() {
    if (!currentQr || "error" in currentQr || downloading) return;
    setDownloading(true);
    setDownloadError(null);
    let objectUrl: string | null = null;

    try {
      let href = currentQr.image;
      if (format === "png") {
        const image = new Image();
        image.src = currentQr.image;
        await image.decode();
        const canvas = document.createElement("canvas");
        canvas.width = 1024;
        canvas.height = 1024;
        const context = canvas.getContext("2d");
        if (!context) throw new Error("Canvas unavailable");
        context.fillStyle = "#ffffff";
        context.fillRect(0, 0, canvas.width, canvas.height);
        context.drawImage(image, 0, 0, canvas.width, canvas.height);
        const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"));
        if (!blob) throw new Error("PNG encoding failed");
        objectUrl = URL.createObjectURL(blob);
        href = objectUrl;
      }

      const link = document.createElement("a");
      link.href = href;
      link.download = `bonusbissen-afiliarse-${storefrontId}.${format}`;
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch {
      setDownloadError("No pudimos descargar el código QR. Intentá de nuevo.");
    } finally {
      if (objectUrl) {
        const url = objectUrl;
        setTimeout(() => URL.revokeObjectURL(url), 1000);
      }
      setDownloading(false);
    }
  }

  return (
    <section className="rounded-3xl border border-border bg-card p-5 shadow-sm sm:p-8">
      <div className="flex items-center gap-3">
        <span className="grid size-10 place-items-center rounded-2xl bg-primary/10 text-foreground">
          <QrCode className="size-5" aria-hidden="true" />
        </span>
        <div>
          <h2 className="text-base font-semibold">QR para compartir</h2>
          <p className="text-xs text-foreground/75">Escanealo para abrir la página de afiliación.</p>
        </div>
      </div>

      {currentQr && "error" in currentQr ? (
        <p role="alert" className="mt-7 text-sm text-foreground/75">{currentQr.error}</p>
      ) : currentQr ? (
        <div className="mt-7 flex flex-col items-center gap-5">
          <div className="w-full max-w-72 rounded-2xl border border-border bg-white p-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={currentQr.image} alt="Código QR de afiliación del local seleccionado" className="aspect-square w-full" />
          </div>
          <a href={currentQr.url} target="_blank" rel="noopener noreferrer" className="max-w-full break-all text-center text-xs text-foreground/75 underline underline-offset-4">
            {currentQr.url}
          </a>
          <div className="flex flex-wrap items-end justify-center gap-3">
            <label htmlFor="qr-format" className="flex flex-col gap-1.5 text-sm font-medium">
              Formato de descarga
              <select
                id="qr-format"
                value={format}
                onChange={(event) => setFormat(event.target.value as "png" | "svg")}
                className="rounded-xl border border-border bg-background px-3 py-2.5 text-foreground focus-visible:outline-2 focus-visible:outline-primary"
              >
                <option value="png">PNG</option>
                <option value="svg">SVG</option>
              </select>
            </label>
            <button
              type="button"
              disabled={downloading}
              onClick={() => void handleDownload()}
              className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-60"
            >
              <Download className="size-4" aria-hidden="true" />
              {downloading ? "Preparando descarga..." : "Descargar código QR"}
            </button>
          </div>
          {downloadError && <p role="alert" className="text-sm text-red-600">{downloadError}</p>}
        </div>
      ) : (
        <p role="status" className="mt-7 text-sm text-foreground/75">Generando código QR...</p>
      )}
    </section>
  );
}
