"use server";

import { signOut } from "@/app/b/actions";
import { request } from "@/lib/api";
import { decodeJwt, getSessionToken } from "@/lib/auth/session";

// public record MovementResponse(
//     UUID id,
//     String type,
//     int points,
//     String imagePath,
//     String title,
//     String orgName,
//     String storefrontName,
//     String pointsLabel,
//     String formattedCreatedAt
// )
//
export type MovementResponse = {
  id: string;
  type: "redeem" | "earn";
  points: number;
  imagePath?: string;
  title: string;
  orgName?: string;
  storefrontName?: string;
  pointsLabel?: string;
  formattedCreatedAt: string;
};

export async function getMovementsHistory(storefrontId?: string) {
  const raw = await getSessionToken();

  if (!raw) return await signOut();

  const token = decodeJwt(raw);
  const userId = token.sub;

  const params = new URLSearchParams();
  if (storefrontId) params.append("storefrontId", storefrontId);

  return await request<MovementResponse[]>(`/users/${userId}/movements?${params.toString()}`);
}
