import { Exchange } from "@/lib/definitions";
import { Check, Ban, Search } from "lucide-react";

type CanjesListProps = {
  exchanges: Exchange[];
};

export default function ExchangesList({ exchanges }: CanjesListProps) {
  const pendings = exchanges.filter((c) => c.state === "pending");
  const rest = exchanges.filter((c) => c.state !== "pending");
  const ordenados = [...pendings, ...rest];

  return (
    <div className="flex flex-col gap-4">
      {/* Buscador sin lógica de filtrado todavía: ver nota en el input */}
      <div className="flex gap-3">
        <input
          type="text"
          placeholder="Buscar por nombre del canje o teléfono del cliente..."
          className="flex-1 rounded-xl border border-ink/15 bg-cream-dark/30 px-5 py-3 text-xl text-ink placeholder:text-ink-soft/70 outline-none focus:border-amber"
        />
        <button
          type="button"
          className="flex items-center gap-2 rounded-xl bg-amber px-6 py-3 text-xl font-medium text-cream hover:bg-amber-dark transition-colors"
        >
          <Search className="h-5 w-5" />
          Buscar
        </button>
      </div>
      <p className="text-xl text-ink-soft">
        {pendings.length} pendiente{pendings.length !== 1 ? "s" : ""}
      </p>

      <div className="flex flex-col gap-3">
        {ordenados.map((canje) => {
          const isApproved = canje.state === "approved";
          const isCancelled = canje.state === "cancelled";
          const inactive = isApproved || isCancelled;

          return (
            <div
              key={canje.id}
              className={`relative rounded-2xl border select-none transition-colors ${
                isCancelled
                  ? "border-ink/10 bg-ink/5 cursor-default"
                  : inactive
                    ? "border-ink/10 bg-ink/5 cursor-pointer"
                    : "border-ink/10 bg-cream-dark/30 hover:bg-cream-dark/50 cursor-pointer"
              }`}
            >
              {inactive && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  {isApproved ? (
                    <Check className="h-20 w-20 text-ink/10" strokeWidth={3} />
                  ) : (
                    <Ban className="h-20 w-20 text-rust/10" strokeWidth={3} />
                  )}
                </div>
              )}

              <div className={`flex items-center justify-between gap-6 px-6 py-5 ${inactive ? "opacity-50 grayscale" : ""}`}>
                <div className="flex items-center gap-5">
                  <div
                    className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2 ${
                      isApproved ? "border-sage bg-sage" : isCancelled ? "border-rust bg-rust" : "border-ink/30 bg-transparent"
                    }`}
                  >
                    {isApproved && <Check className="h-5 w-5 text-cream" />}
                    {isCancelled && <Ban className="h-5 w-5 text-cream" />}
                  </div>

                  <div>
                    <p className={`text-xl font-medium text-ink ${inactive ? "line-through" : ""}`}>{canje.clienteNombre}</p>
                    <p className="text-lg text-ink-soft">
                      DNI {canje.customerId} · {canje.telefono}
                      {isCancelled && canje.motivoAnulacion && <> · Anulado: {canje.motivoAnulacion}</>}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-8">
                  <div className="text-right">
                    <p className={`text-xl font-medium text-ink ${inactive ? "line-through" : ""}`}>{canje.recompensa}</p>
                    <p className="text-lg text-amber-dark font-semibold">{canje.puntos} pts</p>
                  </div>
                  <p className="text-lg text-ink-soft w-32 text-right" suppressHydrationWarning>
                    {formatDate(canje.fecha)}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
