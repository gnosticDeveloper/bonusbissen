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
  rewardImagePath: string;
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
  const res = await dashboardRequest<void>("/exchanges/approve", {
    method: "POST",
    body: JSON.stringify({ id }),
    headers: {
      "Content-Type": "application/json",
    },
  });

  if (!res.ok) throw new Error("Error tratando de confirmar el canje. Por favor intente nuevamente.");
}

export async function annulateExchange(id: string, shouldRefundPoints: boolean = true) {
  const res = await dashboardRequest("/exchanges/cancel", {
    method: "POST",
    body: JSON.stringify({ id, shouldRefundPoints }),
    headers: {
      "Content-Type": "application/json",
    },
  });

  if (!res.ok) throw new Error("Error tratando de anular el canje. Por favor intente nuevamente.");
}
