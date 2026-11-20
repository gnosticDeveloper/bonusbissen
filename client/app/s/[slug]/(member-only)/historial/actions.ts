"use server";

import { request } from "@/lib/api";
import { currentUserId } from "@/lib/auth/session";
import type { MovementResponse } from "@/lib/types/movement";

export async function getMovementsHistory(storefrontId?: string) {
  const userId = await currentUserId();

  const params = new URLSearchParams();
  if (storefrontId) params.append("storefrontId", storefrontId);

  return await request<MovementResponse[]>(`/users/${userId}/movements?${params.toString()}`);
}
