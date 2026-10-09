"use server";

import { dashboardRequest } from "@/lib/api";

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
  state: "pending" | "delivered" | "cancelled";
  points: number;
  formattedCreatedAt: string;
}

export async function getResolvedExchanges() {
  const res = await dashboardRequest<ExchangeResponse[]>("/exchanges/resolved");

  if (!res.ok) return [];

  return res.data;
}

export async function validateCode(code: string) {
  const res = await dashboardRequest<ExchangeResponse>("/exchanges/verify", {
    method: "POST",
    body: JSON.stringify({ code }),
    headers: {
      "Content-Type": "application/json",
    },
  });

  if (!res.ok) return null;

  return res.data;
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
