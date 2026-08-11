"use server";
import { apiFetch } from "@/lib/api";
import { ActionResult, runAction } from "@/lib/action-result";
import { Customer, ExchangeState, Reward } from "@/lib/definitions";
import { updateTag } from "next/cache";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export async function getCustomerById(customerId: string) {
  const response = await apiFetch(`/customers/${customerId}`, {}, { redirectTo: "/mis-puntos/login", tokenKey: "customer_token" });

  const customer = await response.json();
  return customer as Customer;
}

export type PendingExchange = {
  id: string;
  rewardTitle: string;
  points: number;
  exchangeCode: string;
  createdAtFormatted: string; // ya formateada server-side
};

export async function getPendingExchangesByCustomerId(customerId: string) {
  const response = await apiFetch(
    `/exchanges/pending/${customerId}`,
    { next: { tags: ["pending-exchanges"] } },
    { redirectTo: "/mis-puntos/login", tokenKey: "customer_token" },
  );

  const exchanges = await response.json();
  return exchanges as PendingExchange[];
}

export async function cancelExchange(exchangeId: string): Promise<ActionResult<void>> {
  return runAction(async () => {
    await apiFetch(
      `/exchanges/customer-cancel`,
      {
        method: "POST",
        body: JSON.stringify({ exchangeId }),
        headers: { "Content-Type": "application/json" },
      },
      { redirectTo: "/mis-puntos/login", tokenKey: "customer_token" },
    );
    updateTag("pending-exchanges");
  });
}

export async function deleteCustomerById(customerId: string): Promise<ActionResult<void>> {
  return runAction(async () => {
    await apiFetch(
      `/customers/${customerId}`,
      {
        method: "DELETE",
      },
      { redirectTo: "/mis-puntos/login", tokenKey: "customer_token" },
    );
  });
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
      headers: {
        "Content-Type": "application/json",
      },
    },
    { redirectTo: "/mis-puntos/login", tokenKey: "customer_token" },
  );

  if (!response.ok) return null;

  const code = await response.text();
  updateTag("pending-exchanges");
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

export type LoginState = {
  error: string | null;
};

export async function loginCustomer(_: LoginState, formData: FormData): Promise<LoginState> {
  const phone = formData.get("phone")?.toString();

  const backendUrl = process.env.BACKEND_URL ?? "http://localhost:8080";
  const res = await fetch(`${backendUrl}/auth/customer-login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      phone,
    }),
  });

  if (!res.ok) {
    return {
      error: "Número de teléfono incorrecto. Por favor, intenta nuevamente.",
    };
  }

  const { token } = await res.json();

  const cookieStore = await cookies();

  cookieStore.set("customer_token", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
  });

  redirect("/mis-puntos");
}
