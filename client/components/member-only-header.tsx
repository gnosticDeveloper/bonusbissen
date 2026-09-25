"use client";

import { resolveAssetUrl } from "@/lib/helpers/assets";
import type { StorefrontDiscoverInfo } from "@/lib/types/storefront";
import { useUIStore } from "@/lib/ui-store";
import { Menu } from "lucide-react";

const HEADER_PARTICLE_SEEDS = Array.from({ length: 14 }, (_, index) => index);

function hashString(value: string) {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function seededRandom(seed: number) {
  const value = Math.sin(seed * 12.9898) * 43758.5453;
  return value - Math.floor(value);
}

function randomFromRange(seed: number, min: number, max: number) {
  return min + seededRandom(seed) * (max - min);
}

function formatNumber(value: number, decimals = 3) {
  return Number(value.toFixed(decimals));
}

function formatCssNumber(value: number, unit: string, decimals = 3) {
  return `${formatNumber(value, decimals)}${unit}`;
}

export function MemberOnlyHeader({ storefront }: { storefront: StorefrontDiscoverInfo }) {
  const openMenu = useUIStore((state) => state.openMenu); // ver pregunta sobre el nombre del método

  const iconUrl = resolveAssetUrl(storefront.iconUrl);
  const storefrontSeed = hashString(storefront.id);

  const particles = HEADER_PARTICLE_SEEDS.map((index) => {
    const seed = storefrontSeed + index * 97;
    const size = randomFromRange(seed + 2, 2, 4.5);

    return {
      id: index,
      left: formatCssNumber(randomFromRange(seed + 1, 4, 96), "%"),
      width: formatCssNumber(size, "px"),
      height: formatCssNumber(size * 1.65, "px"),
      bottom: formatCssNumber(randomFromRange(seed + 3, 0, 20), "px"),
      animationDelay: formatCssNumber(randomFromRange(seed + 7, 0, 4.8), "s"),
      animationDuration: formatCssNumber(randomFromRange(seed + 8, 3.8, 6.2), "s"),
      rise: formatCssNumber(-randomFromRange(seed + 4, 40, 72), "px"),
      drift: formatCssNumber(randomFromRange(seed + 5, -18, 18), "px"),
      rotate: formatCssNumber(randomFromRange(seed + 6, -35, 35), "deg"),
    };
  });

  return (
    <header
      className="relative isolate overflow-hidden bg-background px-6 pb-7 pt-6 text-center"
      style={
        {
          "--storefront-color": storefront.color,
          "--storefront-soft": `${storefront.color}22`,
          "--storefront-border": `${storefront.color}55`,
        } as React.CSSProperties
      }
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 bottom-0 h-40 opacity-80"
        style={{
          background: `linear-gradient(to top, ${storefront.color}30, transparent)`,
          maskImage: "linear-gradient(to top, black 0%, black 35%, transparent 100%)",
        }}
      />

      <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 bottom-0 z-1 h-40 overflow-visible">
        {particles.map((particle) => (
          <span
            key={particle.id}
            className="member-only-header-particle"
            style={
              {
                left: particle.left,
                width: particle.width,
                height: particle.height,
                bottom: particle.bottom,
                animationDelay: particle.animationDelay,
                animationDuration: particle.animationDuration,
                "--particle-rise": particle.rise,
                "--particle-drift": particle.drift,
                "--particle-rotate": particle.rotate,
              } as React.CSSProperties
            }
          />
        ))}
      </div>

      <button
        type="button"
        onClick={openMenu}
        aria-label="Abrir menú"
        className="absolute right-4 top-4 z-20 grid size-10 place-items-center rounded-full text-foreground transition-colors hover:bg-foreground/5"
      >
        <Menu size={20} aria-hidden="true" />
      </button>

      <div className="relative z-10 mx-auto flex max-w-107.5 items-center justify-center gap-x-3">
        <div
          className="grid size-16 shrink-0 place-items-center overflow-hidden rounded-2xl border bg-card text-3xl font-bold shadow-[0_16px_40px_rgba(25,24,23,0.1)]"
          style={{ borderColor: "var(--storefront-border)" }}
        >
          {iconUrl ? <img src={iconUrl} alt={storefront.name} className="size-full object-cover" /> : storefront.orgName.charAt(0).toUpperCase()}
        </div>

        {/* min-w-0: sin esto el flex item no puede encogerse por debajo de
              su contenido intrínseco y un nombre largo desborda el row.
              wrap-break-word como red de seguridad extra para nombres sin espacios. */}
        <div className="min-w-0 flex-1 text-left">
          <h1 className="text-2xl font-bold uppercase leading-tight text-foreground">{storefront.orgName}</h1>
          <p className="truncate text-xs text-muted">{storefront.name}</p>
        </div>
      </div>

      <style>{`
          .member-only-header-particle {
            position: absolute;
            display: block;
            border-radius: 999px;
            background: var(--storefront-color);
            box-shadow: 0 0 8px var(--storefront-color);
            opacity: 0;
            filter: blur(0.25px);
            will-change: transform, opacity;
            animation: member-only-header-fire linear infinite;
          }

          @keyframes member-only-header-fire {
            0% {
              opacity: 0;
              transform: translate3d(0, 0, 0) scale(0.55) rotate(0deg);
            }

            14% {
              opacity: 0.5;
            }

            78% {
              opacity: 0.16;
            }

            100% {
              opacity: 0;
              transform: translate3d(var(--particle-drift), var(--particle-rise), 0)
                scale(0.12) rotate(var(--particle-rotate));
            }
          }

          @media (prefers-reduced-motion: reduce) {
            .member-only-header-particle {
              animation: none;
              opacity: 0;
            }
          }
        `}</style>
    </header>
  );
}
