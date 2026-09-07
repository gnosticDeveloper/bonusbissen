"use client";

import { Spinner } from "@/components/spinner";
import { PointsResponse } from "@/lib/definitions";
import { formatPoints } from "@/lib/helpers/format";
import { ChevronLeft, ChevronRight, Sparkles } from "lucide-react";
import { useState } from "react";

export function PointsCard({ points }: { points: PointsResponse | null }) {
  const [slide, setSlide] = useState(0);

  if (!points)
    return (
      <section className="relative z-1 mb-8.75">
        <div className="flex min-h-33 items-center justify-center gap-2 rounded-[22px] bg-[#232027] text-sm text-white/80">
          <Spinner />
          <span>Cargando tus puntos...</span>
        </div>
      </section>
    );

  const slides = [{ kind: "total" as const }, ...points.memberships.map((membership) => ({ kind: "membership" as const, membership }))];
  const current = slides[slide];
  const goTo = (direction: number) => setSlide((slide + direction + slides.length) % slides.length);

  return (
    <section className="relative z-1 mb-8.75" aria-label="Resumen de puntos">
      <div
        className="flex min-h-33 items-center justify-between gap-3 rounded-[22px] px-5 py-4 text-white shadow-[0_10px_24px_-6px_rgba(23,19,30,0.35)] transition-colors duration-240"
        style={{ backgroundColor: current.kind === "total" ? "#232027" : current.membership.org.color }}
      >
        {current.kind === "total" ? (
          <>
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
          </>
        ) : (
          <>
            <div className="min-w-0">
              <span className="block text-[10px] font-bold tracking-[0.08em] text-white/70 uppercase">{current.membership.org.category}</span>
              <h1 className="mt-1 truncate text-xl font-semibold tracking-[-0.5px]">{current.membership.org.name}</h1>
              <p className="mt-1 line-clamp-2 max-w-42.5 text-[11px] leading-snug text-white/75">
                Miembro desde {new Date(current.membership.memberSince).toLocaleDateString("es-AR", { month: "long", year: "numeric" })}
              </p>
            </div>
            <div className="shrink-0 text-right">
              <span className="block text-[9px] text-white/65">{current.membership.pointLabel}</span>
              <strong className="mt-0.5 block text-2xl font-bold tracking-[-1px]">{formatPoints(current.membership.points)}</strong>
              <div className="mt-1.5 inline-flex items-center gap-1 rounded-full border border-white/20 bg-white/10 px-2 py-1 text-[8px] text-[#ffafd0]">
                <Sparkles size={11} /> {current.membership.totalRedemptions} canjes
              </div>
            </div>
          </>
        )}
      </div>

      {slides.length > 1 && (
        <>
          <button
            aria-label="Anterior"
            onClick={() => goTo(-1)}
            className="absolute top-1/2 left-4.5 grid h-6.75 w-6.75 -translate-y-1/2 place-items-center rounded-full border border-white/20 bg-black/15 text-white"
          >
            <ChevronLeft size={16} />
          </button>
          <button
            aria-label="Siguiente"
            onClick={() => goTo(1)}
            className="absolute top-1/2 right-4.5 grid h-6.75 w-6.75 -translate-y-1/2 place-items-center rounded-full border border-white/20 bg-black/15 text-white"
          >
            <ChevronRight size={16} />
          </button>
          <div className="mt-3 flex justify-center gap-1.25">
            {slides.map((_, index) => (
              <button
                key={index}
                aria-label={`Ir a slide ${index + 1}`}
                onClick={() => setSlide(index)}
                className={`h-1.25 rounded-full p-0 transition-all duration-180 ${index === slide ? "w-4.25 bg-primary" : "w-1.25 bg-border"}`}
              />
            ))}
          </div>
        </>
      )}
    </section>
  );
}
