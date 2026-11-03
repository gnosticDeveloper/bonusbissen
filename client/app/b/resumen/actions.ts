"use server";

import { revalidatePath } from "next/cache";
import { ActionResult } from "@/lib/action-result";
import { request } from "@/lib/api";
import { currentUserId } from "@/lib/auth/session";
import { HistoricalExchangeResponse } from "@/lib/types/exchange";

export async function getExchangeHistory(sId?: string): Promise<ActionResult<HistoricalExchangeResponse[]>> {
  const userId = await currentUserId();

  const params = new URLSearchParams();
  if (sId) params.append("storefrontId", sId);

  return await request<HistoricalExchangeResponse[]>(`/users/${userId}/exchanges?${params.toString()}`);
}

export async function cancelRedemption(exchangeId: string): Promise<ActionResult<void>> {
  const result = await request<void>("/exchanges/user-cancel", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ exchangeId }),
  });

  if (result.ok) revalidatePath("/b", "layout");
  return result;
}
