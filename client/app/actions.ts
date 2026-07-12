"use server";

import type { Exchange, ExchangeState, Movement } from "@/lib/definitions";
import { cookies } from "next/headers";

export type HomeStats = {
  totalExchanges: number;
  pendingExchanges: number;
  totalCustomers: number;
  totalPointsAwarded: number;
};

export async function getHomeStats(): Promise<HomeStats> {
  const token = (await cookies()).get("bb_token")?.value;

  const response = await fetch("http://localhost:8080/api/home/stats", {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  const data = await response.json();
  return data;
}

export async function getMovements(type: "exchange" | "points" | "all"): Promise<Movement[]> {
  const token = (await cookies()).get("bb_token")?.value;

  const response = await fetch(`http://localhost:8080/api/movements?type=${type}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  const data = await response.json();
  return data;
}

export async function getPendingExchanges(): Promise<Exchange[]> {
  const token = (await cookies()).get("bb_token")?.value;

  const response = await fetch(`http://localhost:8080/api/exchanges/pending`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  const data = await response.json();
  return data;
}

export async function getExchanges(): Promise<Exchange[]> {
  const token = (await cookies()).get("bb_token")?.value;

  const response = await fetch(`http://localhost:8080/api/exchanges`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  const data = await response.json();
  return data;
}
