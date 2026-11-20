import type { PagedRequestFunction } from "@/lib/demo/types";

/**
 * Offline stand-in for Argentina's GeoRef API (used by the main app): a short
 * list of provinces, cities and streets so the address selector works the same way.
 */
export type GeorefItem = { id: string; nombre: string };

const PLACES: Record<string, Record<string, string[]>> = {
  "Ciudad Autónoma de Buenos Aires": {
    "Buenos Aires": ["Av. Corrientes", "Av. Santa Fe", "Honduras", "Thames", "Gorriti", "Av. Rivadavia", "Defensa", "Florida", "Av. Córdoba", "Billinghurst"],
  },
  "Buenos Aires": {
    "La Plata": ["Calle 7", "Calle 12", "Diagonal 74", "Calle 50"],
    "Mar del Plata": ["Av. Colón", "Güemes", "San Martín", "Av. Constitución"],
    "Bahía Blanca": ["Alsina", "O'Higgins", "Av. Colón", "Zelarrayán"],
  },
  "Santa Fe": {
    Rosario: ["Brown", "Pellegrini", "Oroño", "Córdoba", "San Martín", "Urquiza"],
    "Santa Fe": ["San Jerónimo", "Bv. Gálvez", "25 de Mayo", "Rivadavia"],
  },
  Córdoba: {
    Córdoba: ["Av. Colón", "Bv. San Juan", "Obispo Trejo", "Belgrano", "Rondeau"],
    "Villa Carlos Paz": ["Av. San Martín", "Av. Libertad", "Gral. Paz"],
  },
  Mendoza: {
    Mendoza: ["Av. Arístides Villanueva", "San Martín", "Sarmiento", "Belgrano"],
  },
};

const normalize = (value: string) => value.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

function search(names: string[], query: string, page: number, size: number) {
  const term = normalize(query);
  const items = names.filter((name) => normalize(name).includes(term)).map((nombre) => ({ id: nombre, nombre }));
  return { items: items.slice(page * size, (page + 1) * size), page, size, totalPages: Math.max(1, Math.ceil(items.length / size)), totalElements: items.length };
}

const delay = () => new Promise((resolve) => setTimeout(resolve, 180));

export const fetchProvincias: PagedRequestFunction<GeorefItem> = async ({ search: query, page, size }) => {
  await delay();
  return search(Object.keys(PLACES), query, page, size);
};

export function fetchLocalidades(province: string): PagedRequestFunction<GeorefItem> {
  return async ({ search: query, page, size }) => {
    await delay();
    return search(Object.keys(PLACES[province] ?? {}), query, page, size);
  };
}

export function fetchCalles(province: string, city: string): PagedRequestFunction<GeorefItem> {
  return async ({ search: query, page, size }) => {
    await delay();
    return search(PLACES[province]?.[city] ?? [], query, page, size);
  };
}
