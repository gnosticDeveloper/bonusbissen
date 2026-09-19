import { Sparkles } from "lucide-react";
import { Spinner } from "@/components/spinner";
import { formatPoints } from "@/lib/helpers/format";
import type { PointsResponse } from "@/lib/definitions";
import { Carousel } from "./carousel";

export function PointsCard({ points }: { points: PointsResponse | null }) {
  if (!points)
    return (
      <section className="relative z-1 mb-8.75">
        <div className="flex min-h-33 items-center justify-center gap-2 rounded-[22px] bg-[#232027] text-sm text-white/80">
          <Spinner />
          <span>Cargando tus puntos...</span>
        </div>
      </section>
    );

  const totalCard = (
    <div
      className="flex min-h-33 items-center justify-between gap-3 rounded-[22px] px-5 py-4 text-white"
      style={{ backgroundColor: "#232027" }}
    >
      <div className="min-w-0">
        <span className="block text-[10px] font-bold tracking-[0.08em] text-white/70 uppercase">Tu mundo BonusBissen</span>
        <h1 className="mt-1 text-xl font-semibold tracking-[-0.5px]">
          Sumá puntos, <em className="text-[#ffb0d1] not-italic">disfrutá más</em>
        </h1>
        <p className="mt-1 line-clamp-2 max-w-42.5 text-[11px] leading-snug text-white/75">
          Tenés recompensas esperándote en tus lugares favoritos.
        </p>
      </div>
      <div className="shrink-0 text-right">
        <span className="block text-[9px] text-white/65">puntos totales</span>
        <strong className="mt-0.5 block text-2xl font-bold tracking-[-1px]">{formatPoints(points.summary.totalPoints)}</strong>
        <div className="mt-1.5 inline-flex items-center gap-1 rounded-full border border-white/20 bg-white/10 px-2 py-1 text-[8px] text-[#ffafd0]">
          <Sparkles size={11} /> Acumulados
        </div>
      </div>
    </div>
  );

  return (
    <div className="mb-8.75">
      <Carousel
        items={points.memberships}
        mainCard={totalCard}
        renderItem={(membership) => (
          <div
            className="flex min-h-33 items-center justify-between gap-3 rounded-[22px] px-5 py-4 text-white"
            style={{ backgroundColor: membership.org.color }}
          >
            <div className="min-w-0">
              <span className="block text-[10px] font-bold tracking-[0.08em] text-white/70 uppercase">{membership.org.category}</span>
              <h1 className="mt-1 truncate text-xl font-semibold tracking-[-0.5px]">{membership.org.name}</h1>
              <p className="mt-1 line-clamp-2 max-w-42.5 text-[11px] leading-snug text-white/75">
                Miembro desde {new Date(membership.memberSince).toLocaleDateString("es-AR", { month: "long", year: "numeric" })}
              </p>
            </div>
            <div className="shrink-0 text-right">
              <span className="block text-[9px] text-white/65">{membership.pointLabel}</span>
              <strong className="mt-0.5 block text-2xl font-bold tracking-[-1px]">{formatPoints(membership.points)}</strong>
              <div className="mt-1.5 inline-flex items-center gap-1 rounded-full border border-white/20 bg-white/10 px-2 py-1 text-[8px] text-[#ffafd0]">
                <Sparkles size={11} /> {membership.totalRedemptions} canjes
              </div>
            </div>
          </div>
        )}
      />
    </div>
  );
}
