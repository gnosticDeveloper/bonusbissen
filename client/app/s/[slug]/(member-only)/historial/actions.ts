"use server";

import { signOut } from "@/app/b/actions";
import { request } from "@/lib/api";
import { decodeJwt, getSessionToken } from "@/lib/auth/session";


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
  const raw = await getSessionToken();

  if (!raw) return await signOut();

  const token = decodeJwt(raw);
  const userId = token.sub;

  const params = new URLSearchParams();
  if (storefrontId) params.append("storefrontId", storefrontId);

  return await request<MovementResponse[]>(`/users/${userId}/movements?${params.toString()}`);
}
