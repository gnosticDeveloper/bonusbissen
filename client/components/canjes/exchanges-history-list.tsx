import { HistoricalExchange } from "@/app/(customers)/actions";
import { ExchangeState } from "@/lib/definitions";
import { Check, Clock, Ban } from "lucide-react";

type EstadoConfig = { icon: typeof Check; label: string; className: string };

const STATES: Record<ExchangeState, EstadoConfig> = {
  pending: {
    icon: Clock,
    label: "Pendiente de retirar",
    className: "text-amber-dark bg-amber/15",
  },
  delivered: {
    icon: Check,
    label: "Recibido",
    className: "text-sage-dark bg-sage/15",
  },
  cancelled: {
    icon: Ban,
    label: "No recibido",
    className: "text-rust-dark bg-rust/15",
  },
};

const TEXT_COLORS: Record<ExchangeState, string> = {
  pending: "text-amber-dark",
  delivered: "text-sage-dark",
  cancelled: "text-rust-dark",
};

export default function ExchangeHistoryList({ exchanges }: { exchanges: HistoricalExchange[] }) {
  if (exchanges.length === 0) {
    return (
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold text-ink">Mis canjes</h1>
        <p className="text-xl text-ink-soft">Todavía no hiciste ningún canje.</p>
        <p className="text-xl text-ink-soft">Cuando los realices, podrás verlos aquí.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 w-full">
      <h1 className="text-3xl font-bold text-ink">Mis canjes</h1>

      <div className="flex flex-col gap-3">
        {exchanges.map((e) => {
          const config = STATES[e.state] ?? STATES.pending;
          const Icon = config.icon;
          const inactivo = e.state !== "pending";

          return (
            <div
              key={e.id}
              className={`rounded-2xl relative border border-ink/10 px-5 py-4 flex flex-col gap-4 ${
                inactivo ? "bg-ink/5 opacity-70" : "bg-cream-dark/30"
              }`}
            >
              <div className="flex justify-between items-center gap-2">
                <p className="text-xl font-medium text-ink truncate max-w-[17ch] ">{e.rewardTitle}</p>
                <p className={`${TEXT_COLORS[e.state]} text-lg`}>{Math.abs(e.costPoints)} pts</p>
              </div>
              <div className="flex items-center justify-between">
                <p className="text-lg text-ink-soft">{e.formattedCreatedAt}</p>
                <span
                  className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-base font-medium whitespace-nowrap ${config.className}`}
                >
                  <Icon className="h-4 w-4" />
                  {config.label}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
