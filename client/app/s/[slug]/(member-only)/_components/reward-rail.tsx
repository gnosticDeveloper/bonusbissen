"use client";

import { Gift } from "lucide-react";
import { useOpenRewardClaim } from "@/components/modals/rewards/claim-reward-modal";
import { formatNumber } from "@/lib/helpers/format";
import { rewardProgress } from "@/lib/helpers/reward-progress";
import type { Reward } from "@/lib/types/reward";

/**
 * A horizontally scrolling preview of rewards; each card opens the claim sheet, which also
 * explains how far the balance is when the reward isn't affordable yet.
 */
export function RewardRail({
  rewards,
  points,
  pointLabel,
  brandColor,
}: {
  rewards: Reward[];
  points: number | null;
  pointLabel: string;
  brandColor: string | null;
}) {
  const openClaim = useOpenRewardClaim({ points, pointLabel, brandColor });

  return (
    <ul className="-mx-5 flex snap-x snap-mandatory scroll-px-5 gap-3 overflow-x-auto px-5 pb-1">
      {rewards.map((reward) => {
        const missing = points !== null ? rewardProgress(reward.costPoints, points).missing : null;

        return (
          <li key={reward.id} className="w-42 shrink-0 snap-start">
            <button
              type="button"
              onClick={() => openClaim(reward)}
              aria-haspopup="dialog"
              className="flex h-full w-full flex-col overflow-hidden rounded-[20px] border border-border bg-card text-left transition-colors hover:bg-foreground/5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground/70"
            >
              {reward.imageThumbnailUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={reward.imageThumbnailUrl} alt="" className="h-28 w-full object-cover" />
              ) : (
                <span aria-hidden="true" className="grid h-28 w-full place-items-center bg-brand/15 text-brand-ink">
                  <Gift className="size-7" />
                </span>
              )}

              <span className="flex w-full flex-1 flex-col gap-2.5 px-3 pt-3 pb-3.5">
                <span className="line-clamp-2 text-[15px] leading-[1.3] font-bold text-foreground">{reward.title}</span>
                <span className="mt-auto flex flex-wrap items-center justify-between gap-x-2 gap-y-1.5">
                  <span className="text-sm font-bold tabular-nums text-foreground">
                    {formatNumber(reward.costPoints)} <span className="font-medium text-foreground/75">{pointLabel}</span>
                  </span>
                  {missing !== null && (
                    <span
                      className={`inline-flex h-6 items-center rounded-full px-2.25 text-xs ${
                        missing === 0 ? "bg-brand/20 font-bold text-brand-ink" : "bg-foreground/10 font-semibold text-foreground/80"
                      }`}
                    >
                      {missing === 0 ? "Canjeable" : `Faltan ${formatNumber(missing)}`}
                    </span>
                  )}
                </span>
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
