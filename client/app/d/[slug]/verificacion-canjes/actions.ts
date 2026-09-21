"use server";

import { dashboardRequest } from "@/lib/api";

export interface Redemption {
  id: string;
  code: string;
  state: "pending" | "delivered" | "cancelled";
  reward: {
    title: string;
    description: string;
    pointsRequired: number;
    imagePath?: string;
    discountValue: string;
  };
  customer: {
    phone: string;
    name: string;
    id: string;
  };
  resolvedAt?: string;
  resolvedBy?: string;
  redeemedAt: string;
}

export async function getResolvedExchanges() {
  const res = await dashboardRequest<Redemption[]>("/exchanges/resolved");

  if (!res.ok) return [];

  return res.data;
}

export async function validateCode(code: string) {
  const res = await dashboardRequest<Redemption>("/exchanges/verify", {
    body: JSON.stringify({ code }),
    headers: {
      "Content-Type": "application/json",
    },
  });

  if (!res.ok) return null;

  return res.data;
}

export async function confirmRedemption(id: string) {
  const res = await dashboardRequest("/exchanges/approve", {
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
