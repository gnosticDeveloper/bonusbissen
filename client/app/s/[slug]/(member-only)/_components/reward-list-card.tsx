"use client";

import { useId } from "react";
import { Gift } from "lucide-react";
import { useOpenRewardClaim } from "@/components/modals/rewards/claim-reward-modal";
import { formatNumber } from "@/lib/helpers/format";
import { rewardProgress } from "@/lib/helpers/reward-progress";
import type { Reward } from "@/lib/types/reward";
import { ProgressBar } from "./progress-bar";

/**
 * One reward of the storefront list. With an unknown balance it still offers "Canjear":
 * the backend checks the balance on claim and the modal shows its answer.
 */
export function RewardListCard({
  reward,
  points,
  pointLabel,
  brandColor,
}: {
  reward: Reward;
  points: number | null;
  pointLabel: string;
  brandColor: string | null;
}) {
  const openClaim = useOpenRewardClaim({ points, pointLabel, brandColor });
  const titleId = useId();
  const progress = points !== null ? rewardProgress(reward.costPoints, points) : null;
  const canClaim = !progress || progress.missing === 0;

  const handleOpen = () => openClaim(reward);

  return (
    <article aria-labelledby={titleId} className="flex flex-col gap-3.5 rounded-[20px] border border-border bg-card p-3.5">
      <div className="flex gap-3.5">
        {reward.imageThumbnailUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={reward.imageThumbnailUrl} alt="" className="size-23 shrink-0 rounded-[14px] bg-background object-cover" />
        ) : (
          <span aria-hidden="true" className="grid size-23 shrink-0 place-items-center rounded-[14px] bg-brand/15 text-brand-ink">
            <Gift className="size-7" />
          </span>
        )}

        <div className="flex min-w-0 flex-1 flex-col gap-1.5">
          <h2 id={titleId} className="text-base leading-[1.3] font-bold text-foreground">
            {reward.title}
          </h2>
          {reward.description && <p className="line-clamp-2 text-sm leading-[1.45] text-foreground/75">{reward.description}</p>}
        </div>
      </div>

      <div className="flex items-center justify-between gap-3 border-t border-border pt-3">
        <p className="text-lg font-bold tabular-nums text-foreground">
          {formatNumber(reward.costPoints)} <span className="text-sm font-medium text-foreground/75">{pointLabel}</span>
        </p>

        {canClaim ? (
          <button
            type="button"
            onClick={handleOpen}
            aria-describedby={titleId}
            aria-haspopup="dialog"
            className="h-11 shrink-0 rounded-xl bg-brand px-5 text-[15px] font-bold text-brand-contrast transition-opacity hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground/70"
          >
            Canjear
          </button>
        ) : (
          <div className="flex w-32 shrink-0 flex-col items-end gap-1.5">
            <span className="text-[13px] font-semibold text-foreground/85">Faltan {formatNumber(progress.missing)}</span>
            <ProgressBar
              percent={progress.percent}
              label={`Progreso hacia ${reward.title}`}
              valueText={`Te faltan ${formatNumber(progress.missing)} ${pointLabel}`}
              trackClassName="h-1.5"
              fillClassName="bg-brand-ink"
            />
          </div>
        )}
      </div>
    </article>
  );
}
