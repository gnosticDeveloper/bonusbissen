// TODO: Get rid of the hardcoded colour. Use a predefined colour palette and random selection between those colours.
const getRandomHexColour = (): string => {
  return `#${Math.floor(Math.random() * 16777215).toString(16).padStart(6, "0")}`;
};

// Genera una imagen placeholder en base64 para el mock. Cuando haya
// productos reales, esto se reemplaza por la imagen que cargue el dueño
// en el alta del producto.
export function mockRewardImage(label: string): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="400">
    <rect width="100%" height="100%" fill="${getRandomHexColour()}"/>
    <text x="50%" y="50%" font-family="sans-serif" font-weight="700" font-size="28" fill="#2f2b27" text-anchor="middle" dominant-baseline="middle">${label}</text>
  </svg>`;
  return `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;
}
