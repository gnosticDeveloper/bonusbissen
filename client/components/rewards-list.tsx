import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatPoints, truncate } from "@/lib/helpers/format";
import { Gift, Sparkles } from "lucide-react";
import { Reward } from "@/lib/types/reward";
import { DeleteRewardButton, EditRewardButton } from "./create-reward-button";

export default function RewardsList({ rewards, isAdmin }: { rewards: Reward[]; isAdmin: boolean }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {rewards.map((reward) => (
        <Card
          key={reward.id}
          className="group flex flex-col overflow-hidden rounded-2xl border-border bg-card shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md"
        >
          <div className="relative overflow-hidden bg-background">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={reward.imagePath || "/placeholder.svg"}
              alt={reward.title}
              className="h-40 w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
            />

            <div className="absolute inset-x-0 bottom-0 h-20 bg-linear-to-t from-foreground/45 to-transparent" />

            <div className="absolute bottom-3 left-3 flex items-center gap-1.5 rounded-full bg-card/90 px-2.5 py-1 text-[11px] font-semibold text-primary shadow-sm backdrop-blur-sm">
              <Sparkles className="size-3.5" aria-hidden="true" />
              {formatPoints(reward.costPoints)} pts
            </div>
          </div>

          <div className="flex flex-1 flex-col gap-3 p-4">
            <div className="flex items-start justify-between gap-3">
              <h3 className="min-w-0 text-base font-semibold leading-tight tracking-[-0.02em] text-foreground">{reward.title}</h3>

              <Badge tone="primary" className="shrink-0 rounded-full bg-primary/10 px-2.5 py-1 text-[10px] font-semibold text-primary">
                {reward.discountValue}
              </Badge>
            </div>

            <p className="line-clamp-3 text-sm leading-5 text-muted">{truncate(reward.description, 96)}</p>

            <div className="mt-auto flex items-end justify-between gap-3 border-t border-border/70 pt-3">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted">Se canjea por</p>
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
