const PLACEHOLDER_COLOURS = ["#c9b899", "#a8b89a", "#d4a574", "#c98f7a", "#b8927d"];

const getRandomHexColour = (): string => {
  const randomIndex = Math.floor(Math.random() * PLACEHOLDER_COLOURS.length);
  return PLACEHOLDER_COLOURS[randomIndex];
};

/**
 * Genera una imagen placeholder en base64 para el mock.
 * @param label El texto que se mostrará en la imagen.
 * @returns La imagen placeholder en base64.
 */
export function mockRewardImage(label: string): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="400">
    <rect width="100%" height="100%" fill="${getRandomHexColour()}"/>
    <text x="50%" y="50%" font-family="sans-serif" font-weight="700" font-size="4rem" fill="#2f2b27" text-anchor="middle" dominant-baseline="middle">${label}</text>
  </svg>`;
  return `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;
}
