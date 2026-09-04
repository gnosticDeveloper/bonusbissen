"use server";

import { apiServer } from "@/lib/api";


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
  const res = await apiServer("/exchanges/resolved");

  if (!res.ok) return null;

  return await res.json() as Redemption[];
}

export async function validateCode(code: string): Promise<Redemption | null> {
  const res = await apiServer("/exchanges/verify", {
    body: JSON.stringify({ code }),
    headers: {
      "Content-Type": "application/json",
    },
  });

  if (!res.ok) return null;

  return await res.json();
}

export async function confirmRedemption(id: string) {
  const res = await apiServer("/exchanges/approve", {
    method: "POST",
    body: JSON.stringify({ id }),
    headers: {
      "Content-Type": "application/json",
    },
  });

  if (!res.ok) throw new Error("Error tratando de confirmar el canje. Por favor intente nuevamente.");
}

export async function annulateExchange(id: string, shouldRefundPoints: boolean = true) {
  const res = await apiServer("/exchanges/cancel", {
    method: "POST",
    body: JSON.stringify({ id, shouldRefundPoints }),
    headers: {
      "Content-Type": "application/json",
    },
  });

  if (!res.ok) throw new Error("Error tratando de anular el canje. Por favor intente nuevamente.");
}
