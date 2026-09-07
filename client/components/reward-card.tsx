import { Reward } from "@/lib/types/reward";
import { Sparkles } from "lucide-react";

export function RewardCard({ reward, color }: { reward: Reward; color: string }) {
  return (
    <div className="flex min-w-0 flex-1 overflow-hidden rounded-[14px] border bg-black/9" style={{ borderColor: `${color}55` }}>
      <div
        className="h-14.5 w-14.5 shrink-0 bg-cover bg-center"
        style={{ backgroundImage: `linear-gradient(180deg, transparent, ${color}), url(${reward.imagePath})` }}
      />
      <div className="min-w-0 px-2.25 py-2">
        <strong className="block truncate text-[11px]">{reward.title}</strong>
        <p className="my-0.75 truncate text-[9px] text-white/74">{reward.description}</p>
        <span className="inline-flex items-center gap-1 truncate text-[8px] text-[#ffafd0]">
          <Sparkles size={11} /> {reward.costPoints} puntos{reward.discountValue ? ` · ${reward.discountValue}% off` : ""}
        </span>
      </div>
    </div>
  );
}
