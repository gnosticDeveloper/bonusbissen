import { CARD_PALETTES, pickCardVariant } from "@/lib/helpers/color";
import { formatPoints } from "@/lib/helpers/format";
import { Reward } from "@/lib/types/reward";

export function RewardCard({ reward, color, pointsLabel }: { reward: Reward; color: string; pointsLabel: string | null }) {
  const palette = CARD_PALETTES[pickCardVariant(color)];

  return (
    <div className="relative aspect-4/3 w-full overflow-hidden bg-muted/20">
      {reward.imagePath ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={reward.imagePath} alt={reward.title} className="size-full object-cover" />
      ) : (
        <div className="grid size-full place-items-center bg-muted/20 text-xs text-muted" aria-label="Esta recompensa no tiene imagen">
          Sin imagen
        </div>
      )}

      <div className="absolute inset-x-0 bottom-0 bg-linear-to-t from-black/80 via-black/30 to-transparent px-4 pb-4 pt-16 text-primary-foreground">
        <div className="flex items-end justify-between gap-3">
          <div className="min-w-0">
            <h4 className="truncate text-base font-semibold tracking-[-0.02em]">{reward.title}</h4>
            <p className="mt-1 line-clamp-1 text-xs text-primary-foreground/75">{reward.description}</p>
          </div>

          <span className="shrink-0 rounded-full px-2.5 py-1 text-[10px] font-semibold" style={{ backgroundColor: color, color: palette.text }}>
            {formatPoints(reward.costPoints)} {pointsLabel ?? "puntos"}
          </span>
        </div>
      </div>
    </div>
  );
}
