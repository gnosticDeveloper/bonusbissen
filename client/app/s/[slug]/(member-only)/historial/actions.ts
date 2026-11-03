"use server";

import { request } from "@/lib/api";
import { currentUserId } from "@/lib/auth/session";


export type MovementResponse = {
  id: string;
  type: "redeem" | "earn" | "adjust" | "expire";
  points: number;
  imageUrl?: string;
  title: string;
  orgName?: string;
  storefrontName?: string;
  pointsLabel?: string;
  formattedCreatedAt: string;
  createdAt: string;
  expiresAt: string | null;
  expirationApplicable: boolean;
  correction: boolean;
  correctedTransactionId: string | null;
  correctedTransactionAmount: number | null;
};

export async function getMovementsHistory(storefrontId?: string) {
  const userId = await currentUserId();

  const params = new URLSearchParams();
  if (storefrontId) params.append("storefrontId", storefrontId);

  return await request<MovementResponse[]>(`/users/${userId}/movements?${params.toString()}`);
}
