import { Sparkles } from "lucide-react";
import { Spinner } from "@/components/spinner";
import { ErrorState } from "@/components/error-state";
import type { PointsResponse } from "@/lib/definitions";
import { Carousel, CarouselReveal } from "./carousel";
import { CARD_PALETTES, pickCardVariant } from "@/lib/helpers/color";
import { formatNumber } from "@/lib/helpers/format";

type PointsCardProps = {
  points: PointsResponse | null;
  /** The last load failed; takes priority over the loading view. */
  error?: boolean;
  onRetry?: () => void;
};

export function PointsCard({ points, error = false, onRetry }: PointsCardProps) {
  if (error)
    return (
      <section className="relative z-1 mb-8.75 px-5">
        <ErrorState
          icon={Sparkles}
          title="No pudimos cargar tus puntos"
          description="Revisá tu conexión y volvé a intentar."
          onRetry={onRetry}
        />
      </section>
    );

  if (!points)
    return (
      <section className="relative px-5 z-1 mb-8.75">
        <div className="flex min-h-33 items-center justify-center gap-2 rounded-[22px] bg-card text-sm text-foreground">
          <Spinner />
          <span>Cargando tus puntos...</span>
        </div>
      </section>
    );

  const totalCard = (
    <div className="flex min-h-33 items-center justify-between gap-3 rounded-[22px] px-5 py-4 mx-1 bg-card text-foreground">
      <CarouselReveal className="min-w-0">
        <span className="block text-[10px] font-bold tracking-[0.08em] text-foreground/80 uppercase">Tu mundo BonusBissen</span>
        <h1 className="mt-1 text-xl font-semibold tracking-[-0.5px]">
          Sumá puntos, <em className="text-foreground not-italic">disfrutá más</em>
        </h1>
        <p className="mt-1 line-clamp-2 max-w-42.5 text-[11px] leading-snug text-foreground/80">Tenés recompensas esperándote en tus lugares favoritos.</p>
      </CarouselReveal>
      <CarouselReveal className="shrink-0 text-right">
        <span className="block text-[9px] text-foreground/80">puntos totales</span>
        <strong className="mt-0.5 block text-2xl font-bold tracking-[-1px]">{formatNumber(points.summary.totalPoints)}</strong>
        <div className="mt-1.5 inline-flex items-center gap-1 rounded-full border border-border bg-primary/15 px-2 py-1 text-[8px] text-foreground">
          <Sparkles size={11} /> Acumulados
        </div>
      </CarouselReveal>
    </div>
  );

  return (
    <div className="mb-8.75 px-5">
      <Carousel
        items={points.memberships}
        mainCard={totalCard}
        renderItem={(membership) => {
          const palette = CARD_PALETTES[pickCardVariant(membership.org.color)];

          return (
            <div
              className="bg-linear-to-t from-black/50 via-black/20 to-transparent flex min-h-33 items-center justify-between gap-3 rounded-[22px] px-5 py-4 mx-1"
              style={{ backgroundColor: membership.org.color, color: palette.text }}
            >
              <CarouselReveal className="min-w-0">
                <span className="block text-[10px] font-bold tracking-[0.08em] uppercase">{membership.org.category}</span>
                <h1 className="mt-1 truncate text-2xl font-semibold tracking-[-0.5px]">{membership.org.name}</h1>
                <p className="mt-1 line-clamp-2 max-w-44 text-xs leading-snug font-bold">
                  Miembro desde {new Date(membership.memberSince).toLocaleDateString("es-AR", { month: "long", year: "numeric" })}
                </p>
              </CarouselReveal>
              <CarouselReveal className="shrink-0 text-right">
                <span className="block text-xs">{membership.pointLabel}</span>
                <strong className="mt-0.5 block text-2xl font-bold tracking-[-1px]">{formatNumber(membership.points)}</strong>
                <div className="mt-1.5 inline-flex items-center gap-1 rounded-full border border-border bg-primary/15 px-2 py-1 text-[8px]">
                  <Sparkles size={11} /> {membership.totalRedemptions} canjes
                </div>
              </CarouselReveal>
            </div>
          );
        }}
      />
    </div>
  );
}
