"use server";

import { request } from "@/lib/api";
import { Business } from "@/lib/types/business";
import { cache } from "react";

// Nota: Lo implementé, y ya anda esto xd. 🐟
export async function getBusinessByStorefrontId(storefrontId: string) {
  // recordatorio: no uso /storefronts porque ese controlador no es para role user.
  return request<Business>(`/discover/${storefrontId}/business`);
}

export interface MemberPoints {
  points: number;
}

// le clavé un endpoint chiquito acá para reducir un poco el tráfico.
// Cached per request: the layout (side menu) and the page (header, card, affordability) both read it.
export const getMemberPoints = cache(async (storefrontId: string) => {
  return request<MemberPoints>(`/users/me/storefronts/${storefrontId}/points`);
});
