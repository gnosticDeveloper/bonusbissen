import type { CSSProperties } from "react";
import { Gift, Heart, Sparkles, Star } from "lucide-react";
import { CARD_PALETTES, pickCardVariant } from "@/lib/helpers/color";
import { formatPoints } from "@/lib/helpers/format";
import { Reward } from "@/lib/types/reward";
import { CarouselReveal } from "./carousel";

export function RewardCard({ reward, color, pointsLabel }: { reward: Reward; color: string; pointsLabel: string | null }) {
  const palette = CARD_PALETTES[pickCardVariant(color)];

  return (
    <div className="relative aspect-4/3 w-full overflow-hidden bg-muted/20">
      {reward.imageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={reward.imageUrl} alt={reward.title} draggable={false} decoding="async" className="size-full object-cover" />
      ) : (
        <RewardArtwork color={color} />
      )}

      <div className="absolute inset-x-0 bottom-0 bg-linear-to-t from-black/80 via-black/30 to-transparent px-4 pb-4 pt-16 text-white">
        <div className="flex items-end justify-between gap-3">
          <CarouselReveal className="min-w-0">
            <h4 className="truncate text-base font-semibold tracking-[-0.02em]">{reward.title}</h4>
            <p className="mt-1 line-clamp-1 text-xs text-white">{reward.description}</p>
          </CarouselReveal>

          <CarouselReveal className="shrink-0">
            <span className="block rounded-full px-2.5 py-1 text-[10px] font-semibold" style={{ backgroundColor: color, color: palette.text }}>
              {formatPoints(reward.costPoints)} {pointsLabel ?? "puntos"}
            </span>
          </CarouselReveal>
        </div>
      </div>
    </div>
  );
}

const CONFETTI: { className: string; tone: "light" | "dark"; rotate: number }[] = [
  { className: "left-[12%] top-[16%] h-1.5 w-3.5", tone: "light", rotate: -24 },
  { className: "left-[26%] top-[40%] size-2 rounded-full", tone: "dark", rotate: 0 },
  { className: "right-[14%] top-[12%] size-1.5 rounded-full", tone: "light", rotate: 0 },
  { className: "right-[24%] top-[46%] h-1.5 w-4", tone: "dark", rotate: 32 },
  { className: "left-[8%] top-[56%] size-1.5 rounded-full", tone: "light", rotate: 0 },
  { className: "right-[8%] top-[30%] h-1 w-3", tone: "light", rotate: 58 },
];

function RewardArtwork({ color }: { color: string }) {
  const base = color || "var(--primary)";
  const lightest = `color-mix(in oklab, ${base} 22%, white)`;
  const light = `color-mix(in oklab, ${base} 60%, white)`;
  const dark = `color-mix(in oklab, ${base} 65%, black)`;
  const darkest = `color-mix(in oklab, ${base} 35%, black)`;

  const tone = (value: "light" | "dark") => (value === "light" ? lightest : darkest);
  const iconStyle = (value: string, opacity: number): CSSProperties => ({ color: value, opacity });

  return (
    <div
      aria-hidden
      className="absolute inset-0 overflow-hidden"
      style={{
        background: [
          `radial-gradient(circle at 50% 30%, color-mix(in oklab, ${lightest} 45%, transparent) 0%, transparent 28%)`,
          `radial-gradient(ellipse 60% 55% at 8% 0%, color-mix(in oklab, ${lightest} 75%, transparent) 0%, transparent 100%)`,
          `radial-gradient(ellipse 65% 60% at 100% 100%, color-mix(in oklab, ${darkest} 75%, transparent) 0%, transparent 100%)`,
          `linear-gradient(145deg, ${light} 0%, ${base} 50%, ${dark} 100%)`,
        ].join(", "),
      }}
    >

      <div
        className="absolute inset-0 opacity-40"
        style={{
          backgroundImage: `radial-gradient(${lightest} 1.1px, transparent 1.6px)`,
          backgroundSize: "16px 16px",
          maskImage: "radial-gradient(ellipse 70% 60% at 50% 30%, black 15%, transparent 75%)",
        }}
      />

      <div className="absolute left-1/2 top-[8%] aspect-square w-[46%] -translate-x-1/2 rounded-full border border-dashed opacity-50" style={{ borderColor: lightest }} />
      <Gift className="absolute left-1/2 top-[19%] h-auto w-[20%] -translate-x-1/2 -rotate-8" strokeWidth={1.5} style={iconStyle(lightest, 0.95)} />
      <Sparkles className="absolute left-[30%] top-[14%] h-auto w-[7%] rotate-12" strokeWidth={1.75} style={iconStyle(lightest, 0.85)} />
      <Star className="absolute right-[29%] top-[38%] h-auto w-[5%] -rotate-12" strokeWidth={2} style={iconStyle(lightest, 0.7)} />
      <Heart className="absolute left-[18%] top-[30%] h-auto w-[4.5%] -rotate-18" strokeWidth={2} style={iconStyle(darkest, 0.45)} />
      <Sparkles className="absolute right-[16%] top-[20%] h-auto w-[4%]" strokeWidth={2} style={iconStyle(darkest, 0.45)} />

      {CONFETTI.map((piece, index) => (
        <span
          key={index}
          className={`absolute rounded-sm ${piece.className}`}
          style={{ background: tone(piece.tone), opacity: piece.tone === "light" ? 0.75 : 0.4, rotate: `${piece.rotate}deg` }}
        />
      ))}
    </div>
  );
}
