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
      <section className="membership-carousel">
        <div className="hero-card points-loading">
          <Spinner />
          <span>Cargando tus puntos...</span>
        </div>
      </section>
    );
  const slides = [{ kind: "total" as const }, ...points.memberships.map((membership) => ({ kind: "membership" as const, membership }))];
  const current = slides[slide];
  const goTo = (direction: number) => setSlide((slide + direction + slides.length) % slides.length);
  return (
    <section className="membership-carousel" aria-label="Resumen de puntos">
      <div className="hero-card" style={{ backgroundColor: current.kind === "total" ? "#232027" : current.membership.org.color }}>
        {current.kind === "total" ? (
          <>
            <div className="hero-copy">
              <span className="eyebrow">Tu mundo BonusBissen</span>
              <h1>
                Sumá puntos.
                <br />
                <em>Disfrutá más.</em>
              </h1>
              <p>Tenés recompensas esperándote en tus lugares favoritos.</p>
            </div>
            <div className="total-points">
              <span>puntos totales</span>
              <strong>{formatPoints(points.summary.totalPoints)}</strong>
              <div className="point-badge">
                <Sparkles size={12} /> Tus puntos acumulados
              </div>
            </div>
          </>
        ) : (
          <>
            <div className="hero-copy">
              <span className="eyebrow">{current.membership.org.category}</span>
              <h1>
                {current.membership.org.name}
                <br />
                <em>te espera.</em>
              </h1>
              <p>Tu membresía sigue sumando en cada visita.</p>
            </div>
            <div className="total-points">
              <span>{current.membership.pointLabel}</span>
              <strong>{formatPoints(current.membership.points)}</strong>
              <div className="point-badge">
                <Sparkles size={12} /> {current.membership.totalRedemptions} canjes recibidos
              </div>
            </div>
            <small className="membership-name">
              Miembro desde {new Date(current.membership.memberSince).toLocaleDateString("es-AR", { month: "long", year: "numeric" })}
            </small>
          </>
        )}
      </div>
      {slides.length > 1 && (
        <>
          <button className="carousel-arrow carousel-prev" aria-label="Anterior" onClick={() => goTo(-1)}>
            <ChevronLeft size={16} />
          </button>
          <button className="carousel-arrow carousel-next" aria-label="Siguiente" onClick={() => goTo(1)}>
            <ChevronRight size={16} />
          </button>
          <div className="carousel-dots">
            {slides.map((_, index) => (
              <button
                key={index}
                aria-label={`Ir a slide ${index + 1}`}
                className={index === slide ? "active" : ""}
                onClick={() => setSlide(index)}
              />
            ))}
          </div>
        </>
      )}
    </section>
  );
}
