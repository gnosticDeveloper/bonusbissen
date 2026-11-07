"use server";

import { ActionResult, dashboardRequest } from "@/lib/api";
import { ExchangeState } from "@/lib/types/exchange";

export interface ExchangeResponse {
  id: string;
  userId: string;
  userName: string;
  username: string;
  employeeName: string;
  rewardId: string;
  rewardTitle: string;
  rewardDescription: string;
  rewardImageUrl: string;
  rewardDiscountValue: number;
  rewardCostPoints: number;
  state: ExchangeState;
  points: number;
  formattedCreatedAt: string;
}

export async function getResolvedExchanges(): Promise<ActionResult<ExchangeResponse[]>> {
  return dashboardRequest<ExchangeResponse[]>("/exchanges/resolved");
}

/** A 404 means the code doesn't exist; any other failure is a real error. */
export async function validateCode(code: string): Promise<ActionResult<ExchangeResponse>> {
  return dashboardRequest<ExchangeResponse>("/exchanges/verify", {
    method: "POST",
    body: JSON.stringify({ code }),
    headers: {
      "Content-Type": "application/json",
    },
  });
}

export async function confirmRedemption(id: string) {
  return dashboardRequest<void>("/exchanges/approve", {
    method: "POST",
    body: JSON.stringify({ id }),
    headers: {
      "Content-Type": "application/json",
    },
  });
}

export async function annulateExchange(id: string, shouldRefundPoints: boolean = true) {
  return dashboardRequest<void>("/exchanges/cancel", {
    method: "POST",
    body: JSON.stringify({ id, shouldRefundPoints }),
    headers: {
      "Content-Type": "application/json",
    },
  });
}
