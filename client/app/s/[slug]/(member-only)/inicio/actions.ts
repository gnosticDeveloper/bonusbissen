"use server";

import { signOut } from "@/app/b/actions";
import { request } from "@/lib/api";
import { decodeJwt, getSessionToken } from "@/lib/auth/session";
import { Business } from "@/lib/definitions";

// TODO backend: no existe getBusinessByStorefrontId todavía. Diseñado en base
// a BusinessResponse. Ajustar la ruta/forma cuando el back lo exponga.
export async function getBusinessByStorefrontId(storefrontId: string) {
  // Nota: no uso /storefronts porque ese controlador no es para role user.
  return request<Business>(`/discover/${storefrontId}/business`);
}

export interface MemberPoints {
  points: number;
}

// TODO backend: /users/{id} hoy acepta `programId` como query param opcional.
// Acá se pasa `storefrontId` en su lugar — el back tiene que resolver
// internamente el point_program correspondiente a ese storefront
// (storefronts.point_program_id) en vez de esperar que el cliente lo
// conozca. Ajustar el nombre del query param cuando se defina del lado
// de Spring Boot (dejo `storefrontId` como supuesto).
export async function getMemberPoints(storefrontId: string) {
  const raw = await getSessionToken();

  if (!raw) return await signOut();

  const token = decodeJwt(raw);
  const userId = token.sub;
  // return request<MemberPoints>(`/users/${userId}?${new URLSearchParams(storefrontId)}`);
  return { points: 1000 };
}
