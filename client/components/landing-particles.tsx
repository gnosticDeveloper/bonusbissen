import type { CSSProperties } from "react";
import styles from "@/app/landing.module.css";

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

// Keep the affiliation effect isolated so changes here cannot affect that screen.
const particles = Array.from({ length: 18 }, (_, index) => {
  const seed = hashString("bonusbissen") + index * 97;
  const size = randomFromRange(seed + 2, 2.5, 5.5);

  return {
    left: cssNumber(randomFromRange(seed + 1, 4, 96), "%"),
    width: cssNumber(size, "px"),
    height: cssNumber(size * 1.65, "px"),
    bottom: cssNumber(randomFromRange(seed + 3, 0, 25), "dvh"),
    animationDelay: cssNumber(randomFromRange(seed + 7, 0, 4.8), "s"),
    animationDuration: cssNumber(randomFromRange(seed + 8, 3.8, 6.2), "s"),
    "--particle-rise": cssNumber(-randomFromRange(seed + 4, 24, 46), "dvh"),
    "--particle-drift": cssNumber(randomFromRange(seed + 5, -24, 24), "px"),
    "--particle-rotate": cssNumber(randomFromRange(seed + 6, -35, 35), "deg"),
  } as CSSProperties;
});

export function LandingParticles() {
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0">
      <div className={styles.glow} />
      <div className="absolute inset-x-0 bottom-0 z-1 h-[52dvh] overflow-visible">
        {particles.map((style, index) => (
          <span key={index} className={styles.particle} style={style} />
        ))}
      </div>
    </div>
  );
}
