import { Reward } from "@/lib/types/reward";
import { Sparkles } from "lucide-react";

export function RewardCard({ reward, color, pointsLabel }: { reward: Reward; color: string; pointsLabel: string | null }) {
  return (
    <div className="flex min-w-0 flex-1 relative overflow-hidden rounded-[14px] border bg-black/9" style={{ borderColor: `${color}55` }}>
      <div
        className="w-14.5 shrink-0 self-stretch bg-cover bg-center"
        style={{ backgroundImage: `linear-gradient(180deg, transparent, ${color}), url(${reward.imagePath})` }}
      />
      <div className="min-w-0 flex-1 px-2.25 py-2">
        <strong className="block truncate text-[13px]">{reward.title}</strong>
        <p className="my-0.75 truncate text-[11px] text-white/74">{reward.description}</p>
        <span className="inline-flex items-center gap-1 truncate text-[10px] text-primary-foreground">
          <Sparkles size={13} /> {reward.costPoints} {pointsLabel ?? "puntos"}{" "}
          {reward.discountValue ? ` · ${reward.discountValue}% off` : ""}
        </span>
      </div>
    </div>
  );
}
