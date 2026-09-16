import { Gift, MapPin, Store } from "lucide-react";
import { ExchangeState } from "@/lib/types/exchange";
import { ExchangeStateBadge } from "./exchange-state-badge";
import { CopyCodeButton } from "./copy-code-button";
import type { HistoricalExchangeResponse } from "@/lib/types/exchange";

export function ExchangeCard({
  exchange,
}: {
  exchange: HistoricalExchangeResponse;
}) {
  const isPending = exchange.state === ExchangeState.PENDING;

  return (
    <article className="overflow-hidden rounded-3xl border border-border bg-card shadow-[0_12px_30px_rgba(20,16,25,0.05)]">
      <div className="flex gap-3 p-3.5">
        <div className="relative h-19 w-19 shrink-0 overflow-hidden rounded-[18px] bg-muted/20">
          {exchange.rewardImagePath ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={exchange.rewardImagePath}
              alt={exchange.rewardTitle}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="grid h-full w-full place-items-center text-muted-foreground">
              <Gift className="h-6 w-6" aria-hidden="true" />
            </div>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <p className="truncate text-sm font-semibold text-foreground">
              {exchange.rewardTitle}
            </p>

            <ExchangeStateBadge state={exchange.state} />
          </div>

          <div className="mt-1.5 flex items-center gap-1.5 text-xs text-muted-foreground">
            <Store className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            <p className="truncate">{exchange.organizationName}</p>
          </div>

          <div className="mt-3 flex items-center justify-between gap-2">
            <span className="text-[11px] text-muted-foreground">
              {exchange.formattedCreatedAt}
            </span>

            <span className="rounded-full bg-primary/10 px-2.5 py-1 text-[11px] font-semibold text-primary">
              {exchange.costPoints.toLocaleString("es-AR")}{" "}
              {exchange.pointsUnitLabel}
            </span>
          </div>
        </div>
      </div>

      <div className="border-t border-border/70 px-3.5 py-3">
        {isPending ? (
          <CopyCodeButton code={exchange.exchangeCode} />
        ) : (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <MapPin className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            <p className="truncate">
              {exchange.storefrontName || "Local no especificado"}
            </p>
          </div>
        )}
      </div>
    </article>
  );
}
