import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatPoints, truncate } from "@/lib/helpers/format";
import { Gift } from "lucide-react";
import { Reward } from "@/lib/types/reward";
import { DeleteRewardButton, EditRewardButton } from "./create-reward-button";

export default function RewardsList({ rewards, isAdmin, view }: { rewards: Reward[]; isAdmin: boolean; view: "list" | "grid" }) {
  return (
    <div className={view === "grid" ? "grid gap-4 sm:grid-cols-2 xl:grid-cols-3" : "flex flex-col gap-3"}>
      {rewards.map((reward) => (
        <Card
          key={reward.id}
          className={
            view === "grid"
              ? "group flex flex-col overflow-hidden rounded-2xl border-border bg-card shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md"
              : "group flex flex-col overflow-hidden rounded-2xl border-border bg-card shadow-sm transition-shadow hover:shadow-md sm:flex-row"
          }
        >
          <div
            className={
              view === "grid" ? "relative overflow-hidden bg-background" : "relative h-36 shrink-0 overflow-hidden bg-background sm:h-auto sm:w-44"
            }
          >
            <img
              src={reward.imagePath || "/placeholder.svg"}
              alt={reward.title}
              className={
                view === "grid"
                  ? "h-40 w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                  : "h-full min-h-36 w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
              }
            />
            <div className="absolute inset-x-0 bottom-0 h-20 bg-linear-to-t from-foreground/50 to-transparent" />
            <div className="absolute bottom-3 left-3 rounded-full bg-card/90 px-2.5 py-1 text-[11px] font-semibold text-primary shadow-sm backdrop-blur-sm">
              {formatPoints(reward.costPoints)} pts
            </div>
          </div>

          <div className="flex min-w-0 flex-1 flex-col gap-3 p-4 sm:p-5">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h3 className="truncate text-base font-semibold tracking-[-0.02em] text-foreground">{reward.title}</h3>
                <p className="mt-1 text-xs text-muted">Creada {reward.createdAtFormatted}</p>
              </div>
              <Badge tone="primary" className="shrink-0 rounded-full bg-primary/10 px-2.5 py-1 text-[10px] font-semibold text-primary">
                {reward.discountValue}
              </Badge>
            </div>

            <p className="line-clamp-3 text-sm leading-5 text-muted">{truncate(reward.description, view === "list" ? 180 : 96)}</p>

            <div className="mt-auto flex flex-wrap items-end justify-between gap-3 border-t border-border/70 pt-3">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted">Costo</p>
                <p className="mt-1 text-sm font-bold text-primary">{formatPoints(reward.costPoints)} pts</p>
              </div>
              {isAdmin ? (
                <div className="flex items-center gap-1 rounded-xl border border-border bg-background p-1">
                  <EditRewardButton reward={reward} />
                  <DeleteRewardButton reward={reward} />
                </div>
              ) : null}
            </div>
          </div>
        </Card>
      ))}

      {rewards.length === 0 ? (
        <Card className="col-span-full rounded-2xl border-dashed border-border bg-card/70 px-6 py-12 text-center shadow-none">
          <div className="mx-auto mb-4 grid size-12 place-items-center rounded-2xl bg-primary/10 text-primary">
            <Gift className="size-6" aria-hidden="true" />
          </div>

          <p className="text-sm font-semibold text-foreground">Todavía no cargaste recompensas</p>

          <p className="mx-auto mt-1.5 max-w-xs text-xs leading-5 text-muted">
            Cuando agregues una recompensa, va a aparecer acá para que puedas administrarla.
          </p>
        </Card>
      ) : null}
    </div>
  );
}
