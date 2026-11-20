"use client";

import { type CSSProperties, useMemo, useRef } from "react";
import { useInView } from "motion/react";
import styles from "./landing-particles.module.css";

const PARTICLE_COUNT = 18;

function hashString(value: string) {
  let hash = 2166136261;

  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return hash >>> 0;
}

function randomFromRange(seed: number, min: number, max: number) {
  const value = Math.sin(seed * 12.9898) * 43758.5453;
  return min + (value - Math.floor(value)) * (max - min);
}

function cssNumber(value: number, unit: string) {
  return `${Number(value.toFixed(3))}${unit}`;
}

function createParticles(seedKey: string) {
  const baseSeed = hashString(seedKey);

  return Array.from({ length: PARTICLE_COUNT }, (_, index) => {
    const seed = baseSeed + index * 97;
    const size = randomFromRange(seed + 2, 2.5, 5.5);

    return {
      left: cssNumber(randomFromRange(seed + 1, 4, 96), "%"),
      width: cssNumber(size, "px"),
      height: cssNumber(size * 1.65, "px"),
      bottom: cssNumber(randomFromRange(seed + 3, 0, 25), "svh"),
      animationDelay: cssNumber(randomFromRange(seed + 7, 0, 4.8), "s"),
      animationDuration: cssNumber(randomFromRange(seed + 8, 3.8, 6.2), "s"),
      "--particle-rise": cssNumber(-randomFromRange(seed + 4, 24, 46), "svh"),
      "--particle-drift": cssNumber(randomFromRange(seed + 5, -24, 24), "px"),
      "--particle-rotate": cssNumber(randomFromRange(seed + 6, -35, 35), "deg"),
    } as CSSProperties;
  });
}

/**
 * Glow plus rising embers along the bottom of the nearest positioned ancestor.
 * `seed` keeps the layout deterministic between server and client; `color` defaults to the theme primary.
 */
export function LandingParticles({ color, seed = "bonusbissen" }: { color?: string; seed?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref);
  const particles = useMemo(() => createParticles(seed), [seed]);

  return (
    <div
      ref={ref}
      aria-hidden="true"
      data-paused={inView ? undefined : ""}
      className={`pointer-events-none absolute inset-0 ${styles.root}`}
      style={color ? ({ "--particles-color": color } as CSSProperties) : undefined}
    >
      <div className={styles.glow} />
      <div className={styles.field}>
        {particles.map((style, index) => (
          <span key={index} className={styles.particle} style={style} />
        ))}
      </div>
    </div>
  );
}
