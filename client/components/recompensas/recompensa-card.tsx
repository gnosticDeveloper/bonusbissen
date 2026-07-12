import { Gift, Percent, ImageOff } from "lucide-react";
import type { RecompensaAdmin } from "@/app/actions";

export default function RecompensaCard({ r }: { r: RecompensaAdmin }) {
  const esGratis = r.descuentoPorcentaje === 100;

  return (
    <div className="rounded-2xl border border-ink/10 bg-cream-dark/30 overflow-hidden flex gap-4">
      <div className="w-32 h-32 shrink-0 bg-ink/5 flex items-center justify-center">
        {r.imagenBase64 ? (
          <img src={r.imagenBase64} alt={r.nombre} className="w-full h-full object-cover" />
        ) : (
          <ImageOff className="h-6 w-6 text-ink-soft" />
        )}
      </div>

      <div className="flex-1 py-4 pr-5 flex flex-col gap-2">
        <div className="flex items-start justify-between gap-3">
          <p className="text-xl font-semibold text-ink">{r.nombre}</p>
          <span className="text-lg font-semibold text-amber-dark whitespace-nowrap">{r.costoPuntos} pts</span>
        </div>

        <p className="text-lg text-ink-soft">{r.descripcion}</p>

        <div>
          {esGratis ? (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-sage/15 px-3 py-1 text-base font-medium text-sage-dark">
              <Gift className="h-4 w-4" />
              Producto gratis
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-rust/15 px-3 py-1 text-base font-medium text-rust-dark">
              <Percent className="h-4 w-4" />
              {r.descuentoPorcentaje}% de descuento
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
