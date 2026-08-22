"use server";
import { ActionResult, runAction } from "@/lib/action-result";
import { ApiError } from "@/lib/api-error";
import { Customer, ExchangeState, Reward } from "@/lib/definitions";
import { updateTag } from "next/cache";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

const apiFetch = async (path: string, reqArgs?: RequestInit) => {
  const cookiesStore = await cookies();
  const token = cookiesStore.get("customer_token")?.value;

  if (!token) redirect("/mis-puntos/login", "replace");

  const backendUrl = process.env.BACKEND_URL ?? "http://localhost:8080";

  const res = await fetch(`${backendUrl}${path}`, {
    ...reqArgs,
    headers: {
      ...reqArgs?.headers,
      Authorization: `Bearer ${token}`,
    },
  });

  // TODO: show proper, user-fliendly error messages.
  if (!res.ok) throw new ApiError("Algo salió mal, por favor intente nuevamente.", { code: res.statusText });

  return res;
};

export async function getCustomerById(customerId: string) {
  const response = await apiFetch(`/customers/${customerId}`);

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
  const response = await apiFetch(`/customers/${customerId}/exchanges`, {});

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
  const response = await apiFetch(`/customers/${customerId}/movements`, {});

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
