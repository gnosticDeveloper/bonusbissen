"use server";

import { ActionResult } from "@/lib/action-result";
import { request } from "@/lib/api";
import { decodeJwt, getSessionToken } from "@/lib/auth/session";
import { signOut } from "../actions";
import { HistoricalExchangeResponse } from "@/lib/types/exchange";

export async function getExchangeHistory(sId?: string): Promise<ActionResult<HistoricalExchangeResponse[]>> {
  const raw = await getSessionToken();

  if (!raw) return await signOut();

  const token = decodeJwt(raw);
  const userId = token.sub;

  const params = new URLSearchParams();
  if (sId) params.append("storefrontId", sId);

  return await request<HistoricalExchangeResponse[]>(`/users/${userId}/exchanges?${params.toString()}`);
}
