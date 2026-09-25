"use client";

import { Gift } from "lucide-react";
import type { Reward } from "@/lib/types/reward";
import { useModal } from "@/components/modal";
import { RewardClaimModal } from "@/components/modals/rewards/claim-reward-modal";

export function MemberOnlyRewardCard({ reward }: { reward: Reward }) {
  const { open } = useModal();

  const handleOpen = () => {
    open(<RewardClaimModal reward={reward} />, {
      title: reward.title,
      description: `${reward.costPoints.toLocaleString("es-AR")} pts para canjear`,
    });
  };

  // reward.imagePath already comes fully-resolved from the server (page.tsx
  // prefixes it with ASSETS_URL before passing it down) -- resolving it again
  // here would double the prefix and produce a malformed URL.
  const imageUrl = reward.imagePath;

  return (
    <button
      type="button"
      onClick={handleOpen}
      className="w-full overflow-hidden rounded-3xl border border-border bg-card text-left shadow-[0_12px_30px_rgba(20,16,25,0.05)] transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background active:scale-[0.99]"
    >
      <div className="flex gap-3 p-3.5">
        <div className="relative h-19 w-19 shrink-0 overflow-hidden rounded-[18px] bg-muted/20">
          {imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={imageUrl} alt={reward.title} className="h-full w-full object-cover" />
          ) : (
            <div className="grid h-full w-full place-items-center text-muted-foreground">
              <Gift className="h-6 w-6" aria-hidden="true" />
            </div>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-foreground">{reward.title}</p>

          {reward.description && <p className="mt-1 line-clamp-2 text-xs leading-5 text-muted-foreground">{reward.description}</p>}

          <div className="mt-3 flex items-center justify-between gap-2">
            <span className="text-[11px] text-muted-foreground">{reward.createdAtFormatted}</span>

            <div className="flex items-center gap-1.5">
              {reward.discountValue > 0 && (
                <span className="rounded-full bg-muted/20 px-2.5 py-1 text-[11px] font-semibold text-foreground">{reward.discountValue}% OFF</span>
              )}
              <span className="rounded-full bg-primary/10 px-2.5 py-1 text-[11px] font-semibold text-primary">
                {reward.costPoints.toLocaleString("es-AR")} pts
              </span>
            </div>
          </div>
        </div>
      </div>
    </button>
  );
}
