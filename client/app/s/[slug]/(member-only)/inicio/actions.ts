"use server";

import { signOut } from "@/app/b/actions";
import { request } from "@/lib/api";
import { decodeJwt, getSessionToken } from "@/lib/auth/session";
import { Business } from "@/lib/definitions";

// Nota: Lo implementé, y ya anda esto xd. 🐟
export async function getBusinessByStorefrontId(storefrontId: string) {
  // recordatorio: no uso /storefronts porque ese controlador no es para role user.
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
//
// Nota del developer: toy cansao así que desconozco si hay un endpoint que ya hace esto
// por storefrontId. Pero esto es básicamente para traer un balance. Lo que también se
// podría unir el endpoint de /me en users para que si recibe un storefrontId devuelva también
// los putos del usuario calculados. Y si no hay storefrontId presente, hace lo mismo que hace
// hoy.
// Con esto, podría reutilizar ese mismo endpoint tanto en `/b` como en `/s`.
export async function getMemberPoints(storefrontId: string) {
  const raw = await getSessionToken();

  if (!raw) return await signOut();

  const token = decodeJwt(raw);
  const userId = token.sub;
  return request<MemberPoints>(`/users/${userId}?${new URLSearchParams(storefrontId)}`);
}
