import { Reward } from "@/lib/types/reward";
import { Sparkles } from "lucide-react";

export function RewardCard({ reward, color }: { reward: Reward; color: string }) {
  return (
    <div className="reward-card" style={{ borderColor: `${color}55` }}>
      <div className="reward-image" style={{ backgroundImage: `linear-gradient(180deg, transparent, ${color}), url(${reward.imagePath})` }} />
      <div className="reward-info">
        <strong>{reward.title}</strong>
        <p>{reward.description}</p>
        <span>
          <Sparkles size={11} /> {reward.costPoints} puntos{reward.discountValue ? ` · ${reward.discountValue}% off` : ""}
        </span>
      </div>
    </div>
  );
}
