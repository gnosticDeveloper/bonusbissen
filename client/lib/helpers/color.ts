function relativeLuminance(hex: string): number {
  const clean = hex.replace("#", "").slice(0, 6); // ignora alpha si viene un hex de 8 dígitos (VARCHAR(9) en el schema admite #RRGGBBAA)
  const bigint = parseInt(clean, 16);
  const [r, g, b] = [(bigint >> 16) & 255, (bigint >> 8) & 255, bigint & 255].map((c) => {
    const cs = c / 255;
    return cs <= 0.03928 ? cs / 12.92 : Math.pow((cs + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrastRatio(l1: number, l2: number): number {
  const [lighter, darker] = l1 > l2 ? [l1, l2] : [l2, l1];
  return (lighter + 0.05) / (darker + 0.05);
}

/** Elige el texto que gana más contraste contra este color, no un corte fijo de luminancia. */
export function pickCardVariant(backgroundHex: string): "light-bg" | "dark-bg" {
  const bgLum = relativeLuminance(backgroundHex);
  return contrastRatio(bgLum, 1) >= contrastRatio(bgLum, 0) ? "dark-bg" : "light-bg";
}

export const CARD_PALETTES = {
  "dark-bg": {
    text: "#ffffff",
    textFaint: "#ffffffb0",
    chipBg: "rgba(0,0,0,0.30)",
    chipBorder: "rgba(255,255,255,0.20)",
    scrim: "linear-gradient(180deg, transparent 20%, #00000022 48%, #00000066 100%)",
    buttonBg: "#ffffff",
    buttonText: "#191817",
  },
  "light-bg": {
    text: "#191817",
    textFaint: "#191817b0",
    chipBg: "rgba(255,255,255,0.55)",
    chipBorder: "rgba(25,24,23,0.15)",
    scrim: "linear-gradient(180deg, transparent 20%, #ffffff33 48%, #ffffff88 100%)",
    buttonBg: "#191817",
    buttonText: "#ffffff",
  },
} as const;

export type CardPalette = (typeof CARD_PALETTES)[keyof typeof CARD_PALETTES];
