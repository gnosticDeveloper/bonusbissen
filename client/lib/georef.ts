import { PagedRequestFunction, PagedResponse } from "@/lib/definitions";

const GEOREF_BASE = "https://apis.datos.gob.ar/georef/api/v2.0";
const PAGE_SIZE = 5;

export interface GeorefItem {
  id: string;
  nombre: string;
}

interface GeorefProvinceResponse {
  cantidad: number;
  total: number;
  inicio: number;
  provincias: GeorefItem[];
}
interface GeorefTownResponse {
  cantidad: number;
  total: number;
  inicio: number;
  localidades: GeorefItem[];
}
interface GeorefStreetResponse {
  cantidad: number;
  total: number;
  inicio: number;
  calles: GeorefItem[];
}

const BASE_PARAMS = { orden: "nombre", campos: "basico", max: String(PAGE_SIZE), inicio: "0" };

async function georefFetch<T>(path: string, params: Record<string, string>): Promise<T> {
  const url = new URL(`${GEOREF_BASE}/${path}`);
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }
  const res = await fetch(url.toString());
  if (!res.ok) throw new Error("No se pudo consultar Georef.");
  return res.json();
}

function toPagedResponse<T>(items: T[], totalElements: number): PagedResponse<T> {
  return {
    items,
    page: 0,
    size: PAGE_SIZE,
    totalElements,
    totalPages: Math.ceil(totalElements / PAGE_SIZE),
  };
}

export const fetchProvincias: PagedRequestFunction<GeorefItem> = async ({ search }) => {
  const data = await georefFetch<GeorefProvinceResponse>("provincias", {
    nombre: search,
    ...BASE_PARAMS,
  });
  return toPagedResponse(data.provincias, data.total);
};

export function fetchLocalidades(provincia: string): PagedRequestFunction<GeorefItem> {
  return async ({ search }) => {
    const data = await georefFetch<GeorefTownResponse>("localidades", {
      nombre: search,
      provincia,
      ...BASE_PARAMS,
    });
    return toPagedResponse(data.localidades, data.total);
  };
}

export function fetchCalles(provincia: string, localidadCensal: string): PagedRequestFunction<GeorefItem> {
  return async ({ search }) => {
    const data = await georefFetch<GeorefStreetResponse>("calles", {
      nombre: search,
      provincia,
      localidad_censal: localidadCensal,
      ...BASE_PARAMS,
    });
    return toPagedResponse(data.calles, data.total);
  };
}
