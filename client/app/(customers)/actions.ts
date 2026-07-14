"use server";
import { apiFetch } from "@/lib/api";
import { Customer, ExchangeState, Reward } from "@/lib/definitions";

export async function getCustomerById(customerId: string) {
  const response = await apiFetch(`/customers/${customerId}`, {}, { redirectTo: "/mis-puntos/login", tokenKey: "customer_token" });

  const customer = await response.json();
  return customer as Customer;
}

export type PendingExchange = {
  id: string;
  rewardTitle: string;
  points: number;
  createdAtFormatted: string; // ya formateada server-side
};

export async function getPendingExchangesByCustomerId(customerId: string) {
  const response = await apiFetch(`/exchanges/pending/${customerId}`, {}, { redirectTo: "/mis-puntos/login", tokenKey: "customer_token" });

  const exchanges = await response.json();
  return exchanges as PendingExchange[];
}

export async function cancelExchange(exchangeId: string) {
  const response = await apiFetch(
    `/exchanges/${exchangeId}`,
    {
      method: "DELETE",
    },
    { redirectTo: "/mis-puntos/login", tokenKey: "customer_token" },
  );

  if (!response.ok) {
    throw new Error("Failed to cancel exchange");
  }

  return;
}

export async function deleteCustomerById(customerId: string) {
  const response = await apiFetch(
    `/customers/${customerId}`,
    {
      method: "DELETE",
    },
    { redirectTo: "/mis-puntos/login", tokenKey: "customer_token" },
  );

  if (!response.ok) {
    throw new Error("Failed to delete customer");
  }

  return;
}

export type HistoricalExchange = {
  id: string;
  rewardTitle: string;
  costPoints: number;
  formattedCreatedAt: string;
  state: ExchangeState;
};

export async function getExchangesByCustomerId(customerId: string) {
  const response = await apiFetch(`/customers/${customerId}/exchanges`, {}, { redirectTo: "/mis-puntos/login", tokenKey: "customer_token" });

  const exchanges = await response.json();
  return exchanges as HistoricalExchange[];
}

export type Movement = {
  id: string;
  type: "earn" | "redeem";
  points: number;
  imagePath?: string | null;
  title: string;
  formattedCreatedAt: string;
};

export async function getMovementsByCustomerId(customerId: string) {
  const response = await apiFetch(`/customers/${customerId}/movements`, {}, { redirectTo: "/mis-puntos/login", tokenKey: "customer_token" });

  const movements = (await response.json()) as Movement[];
  const formattedData = movements.map((r) => ({
    ...r,
    imagePath: r.imagePath ? `${process.env.ASSETS_URL}${r.imagePath}` : undefined,
  }));

  return formattedData;
}

export async function claimReward(customerId: string, rewardId: string): Promise<string | null> {
  const response = await apiFetch(
    "/customers/claim-reward",
    {
      body: JSON.stringify({ customerId, rewardId }),
      method: "POST",
    },
    { redirectTo: "/mis-puntos/login", tokenKey: "customer_token" },
  );

  if (!response.ok) return null;

  const code = await response.text();
  return code;
}

export async function getRewards(): Promise<Reward[]> {
  const response = await apiFetch(
    `/rewards`,
    {
      next: {
        tags: ["get-rewards"],
      },
    },
    { redirectTo: "/mis-puntos/login", tokenKey: "customer_token" },
  );

  if (!response.ok) throw new Error("No se pudo obtener las recompensas");
  const data: Reward[] = await response.json();

  const formattedData = data.map((r) => ({
    ...r,
    imagePath: r.imagePath ? `${process.env.ASSETS_URL}${r.imagePath}` : undefined,
  }));

  return formattedData;
}

export async function getReward(id: string): Promise<Reward> {
  const res = await apiFetch(`/rewards/${id}`, {}, { redirectTo: "/mis-puntos/login", tokenKey: "customer_token" });

  if (!res.ok) throw new Error("No se pudo obtener la recompensa");
  return await res.json();
}
