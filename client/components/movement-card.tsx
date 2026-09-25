import { MovementResponse } from "@/app/s/[slug]/(member-only)/historial/actions";
import { Gift, Coins, MapPin, Store } from "lucide-react";

export function MovementCard({ movement }: { movement: MovementResponse }) {
  const isEarn = movement.type === "earn";
  const pointsText = `${Math.abs(movement.points).toLocaleString("es-AR")} ${movement.pointsLabel}`;

  return (
    <article className="overflow-hidden rounded-3xl border border-border bg-card shadow-[0_12px_30px_rgba(20,16,25,0.05)]">
      <div className="flex gap-3 p-3.5">
        <div className="relative h-19 w-19 shrink-0 overflow-hidden rounded-[18px] bg-muted/20">
          {movement.imagePath ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={movement.imagePath} alt={movement.title} className="h-full w-full object-cover" />
          ) : (
            <div
              className={`grid h-full w-full place-items-center ${
                isEarn ? "bg-green-500/10 text-green-600 dark:text-green-400" : "text-muted-foreground"
              }`}
            >
              {isEarn ? <Coins className="h-8 w-8" aria-hidden="true" /> : <Gift className="h-8 w-8" aria-hidden="true" />}
            </div>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-foreground">{movement.title}</p>

          {movement.orgName && (
            <div className="mt-1.5 flex items-center gap-1.5 text-xs text-muted-foreground">
              <Store className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              <p className="truncate">{movement.orgName}</p>
            </div>
          )}

          <div className="mt-3 flex items-center justify-between gap-2">
            <span className="text-[11px] text-muted-foreground">{movement.formattedCreatedAt}</span>

            <span
              className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                isEarn ? "bg-primary/10 text-primary" : "bg-muted/20 text-foreground"
              }`}
            >
              {isEarn ? "+" : "-"}
              {pointsText}
            </span>
          </div>
        </div>
      </div>

      {movement.storefrontName && (
        <div className="border-t border-border/70 px-3.5 py-3">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <MapPin className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            <p className="truncate">{movement.storefrontName}</p>
          </div>
        </div>
      )}
    </article>
  );
}
