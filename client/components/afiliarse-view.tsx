"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StorefrontDiscoverInfo } from "@/lib/types/storefront";
import { joinStorefront } from "@/app/s/[slug]/afiliarse/actions";
import { resolveAssetUrl } from "@/lib/helpers/assets";
import { CARD_PALETTES, pickCardVariant } from "@/lib/helpers/color";
import { useRouter } from "next/navigation";
import { Spinner } from "./spinner";
import { useToast } from "./toast";

const particleSeeds = Array.from({ length: 18 }, (_, index) => index);

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

export function AfiliarseView({ storefront, isLoggedIn }: { storefront: StorefrontDiscoverInfo; isLoggedIn: boolean; joinError?: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleJoin() {
    if (!isLoggedIn) {
      router.push(`/sign-in?joinTo=${storefront.id}`);
      return;
    }

    setError(null);
    startTransition(async () => {
      const result = await joinStorefront(storefront.id);
      if (result && !result.ok) setError(result.error);
    });
  }

  const particles = useMemo(() => {
    const storefrontSeed = hashString(storefront.id);

    return particleSeeds.map((index) => {
      const seed = storefrontSeed + index * 97;
      const size = randomFromRange(seed + 2, 2.5, 5.5);

      return {
        id: index,
        left: formatCssNumber(randomFromRange(seed + 1, 4, 96), "%"),
        width: formatCssNumber(size, "px"),
        height: formatCssNumber(size * 1.65, "px"),
        bottom: formatCssNumber(randomFromRange(seed + 3, 0, 25), "dvh"),
        animationDelay: formatCssNumber(randomFromRange(seed + 7, 0, 4.8), "s"),
        animationDuration: formatCssNumber(randomFromRange(seed + 8, 3.8, 6.2), "s"),
        rise: formatCssNumber(-randomFromRange(seed + 4, 24, 46), "dvh"),
        drift: formatCssNumber(randomFromRange(seed + 5, -24, 24), "px"),
        rotate: formatCssNumber(randomFromRange(seed + 6, -35, 35), "deg"),
      };
    });
  }, [storefront.id]);

  const iconUrl = resolveAssetUrl(storefront.iconUrl);
  const palette = CARD_PALETTES[pickCardVariant(storefront.color)];

  return (
    <main
      className="relative isolate flex min-h-dvh overflow-hidden bg-background text-foreground"
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
        className="pointer-events-none absolute inset-x-0 bottom-0 h-[48dvh] opacity-80"
        style={{
          background: `linear-gradient(to top, ${storefront.color}30, transparent)`,
          maskImage: "linear-gradient(to top, black 0%, black 35%, transparent 100%)",
        }}
      />

      <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 bottom-0 z-1 h-[52dvh] overflow-visible">
        {particles.map((particle) => (
          <span
            key={particle.id}
            className="afiliarse-particle"
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

      <div className="relative z-10 mx-auto flex w-full max-w-sm flex-1 flex-col px-6 py-7 sm:py-9">
        <Link
          href="/b"
          className="flex w-fit items-center gap-2 rounded-full border px-3.5 py-2 text-xs font-medium text-foreground transition-colors hover:border-(--storefront-color) hover:bg-(--storefront-soft)"
          style={{ borderColor: "var(--storefront-border)" }}
        >
          <ArrowLeft className="size-3.5" aria-hidden="true" />
          Volver
        </Link>

        <div className="flex flex-1 flex-col items-center justify-center gap-7 py-12 text-center">
          <div
            className="grid size-24 place-items-center overflow-hidden rounded-[28px] border bg-card text-3xl font-bold shadow-[0_16px_40px_rgba(25,24,23,0.1)]"
            style={{ borderColor: "var(--storefront-border)" }}
          >
            {iconUrl ? <img src={iconUrl} alt={storefront.name} className="size-full object-cover" /> : storefront.orgName.charAt(0).toUpperCase()}
          </div>

          <div className="max-w-xs">
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em]" style={{ color: "var(--storefront-color)" }}>
              {storefront.orgName}
            </p>

            <h1 className="mt-3 text-[30px] font-semibold leading-[1.05] tracking-[-0.055em] text-foreground text-balance">
              ¿Querés ser parte de {storefront.orgName} y empezar a sumar{" "}
              <span style={{ color: "var(--storefront-color)" }}>{storefront.pointLabel ?? "puntos"}</span>?
            </h1>
          </div>
        </div>

        <div className="flex flex-col gap-3 pb-1">
          {error ? (
            <p
              role="alert"
              className="rounded-2xl border px-4 py-3 text-center text-sm leading-5 text-foreground"
              style={{
                borderColor: "var(--storefront-border)",
                backgroundColor: "var(--storefront-soft)",
              }}
            >
              {error}
            </p>
          ) : null}

          <Button
            onClick={handleJoin}
            disabled={pending}
            className="h-12 w-full rounded-2xl text-base font-semibold shadow-[0_10px_24px_color-mix(in_srgb,var(--storefront-color)_28%,transparent)] transition-transform hover:brightness-105 active:scale-[0.99] disabled:opacity-60"
            style={{ backgroundColor: "var(--storefront-color)", color: palette.text }}
          >
            {pending ? (
              <>
                <Spinner />
                {" Uniéndote..."}
              </>
            ) : (
              "Quiero sumarme"
            )}
          </Button>
        </div>
      </div>

      <style>{`
        .afiliarse-particle {
          position: absolute;
          display: block;
          border-radius: 999px;
          background: var(--storefront-color);
          box-shadow: 0 0 8px var(--storefront-color);
          opacity: 0;
          filter: blur(0.25px);
          will-change: transform, opacity;
          animation: storefront-fire linear infinite;
        }

        @keyframes storefront-fire {
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
          .afiliarse-particle {
            animation: none;
            opacity: 0;
          }
        }
      `}</style>
    </main>
  );
}
