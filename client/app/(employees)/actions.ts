"use server";

import { apiFetch } from "@/lib/api";
import { ActionResult, runAction } from "@/lib/action-result";
import { Customer, Exchange } from "@/lib/definitions";
import { updateTag } from "next/cache";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export type HomeStats = {
  totalExchanges: number;
  pendingExchanges: number;
  totalCustomers: number;
  totalPointsAwarded: number;
};

export async function getHomeStats(): Promise<HomeStats> {
  const response = await apiFetch("/employees/home-stats", {}, { tokenKey: "employee_token", redirectTo: "/login" });
  const data = await response.json();

  return data;
}

export async function getCustomerByPhone(phone: string): Promise<Customer | undefined> {
  const response = await apiFetch(
    `/customers/phone/${phone}`,
    {
      method: "GET",
    },
    { redirectTo: "/login", tokenKey: "employee_token" },
  );

  if (!response.ok) return undefined;
  const data = await response.json();
  return data;
}

export async function getPendingExchangesCount(): Promise<number> {
  const response = await apiFetch(
    "/exchanges/pending-count",
    { next: { tags: ["pending-exchanges-count"] } },
    { tokenKey: "employee_token", redirectTo: "/login" },
  );

  const data = await response.text();
  return parseInt(data);
}

export type PendingExchangeReview = {
  id: string;
  customerName: string;
  rewardTitle: string;
  points: number;
  createdAtFormatted: string;
};

export async function getPendingExchanges(): Promise<PendingExchangeReview[]> {
  const response = await apiFetch(
    "/exchanges/pending",
    { next: { tags: ["pending-exchanges-employee"] } },
    { tokenKey: "employee_token", redirectTo: "/login" },
  );

  const data = await response.json();
  return data;
}

export async function getExchanges(): Promise<Exchange[]> {
  const response = await apiFetch("/exchanges", {}, { tokenKey: "employee_token", redirectTo: "/login" });

  const data = await response.json();
  return data;
}

export type TopReward = {
  id: string;
  title: string;
  claimCount: number;
  points: number;
};

export async function getTopRewards(): Promise<TopReward[]> {
  const response = await apiFetch("/rewards/top", {}, { tokenKey: "employee_token", redirectTo: "/login" });

  const data = await response.json();
  return data;
}

export type TopClient = {
  id: string;
  name: string;
  totalPoints: number;
};

export async function getTopClients(): Promise<TopClient[]> {
  const response = await apiFetch("/customers/top", {}, { tokenKey: "employee_token", redirectTo: "/login" });

  const data = await response.json();
  return data;
}

type CustomerPointsAward = {
  customerName: string;
  pointsGranted: number;
};

export async function grantPointsToCustomer(customerId: string, points: number): Promise<ActionResult<CustomerPointsAward>> {
  return runAction(async () => {
    const response = await apiFetch(
      "/customers/grant",
      {
        method: "POST",
        body: JSON.stringify({ customerId, points }),
        headers: { "Content-Type": "application/json" },
      },
      { tokenKey: "employee_token", redirectTo: "/login" },
    );
    return await response.json();
  });
}

export async function verifyExchangeCode(code: string): Promise<Exchange | null> {
  try {
    const res = await apiFetch(
      `/exchanges/verify`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ code }),
      },
      { redirectTo: "/login", tokenKey: "employee_token" },
    );

    return await res.json();
  } catch {
    // apiFetch throws on any non-2xx response, e.g. a code that doesn't exist.
    return null;
  }
}

export type VerifyCodeState = {
  error: string | null;
  exchange: Exchange | null;
};

export async function verifyCodeAction(_prevState: VerifyCodeState, formData: FormData): Promise<VerifyCodeState> {
  const code = (formData.get("code") as string)?.trim();

  if (!code) {
    return { error: "Ingresá un código.", exchange: null };
  }

  const exchange = await verifyExchangeCode(code);

  if (!exchange) {
    return {
      error: "No encontramos ese código entre los canjes pendientes. Recibilo con cuidado del cliente y volvé a ingresarlo.",
      exchange: null,
    };
  }

  return { error: null, exchange };
}

export async function annulateExchange(exchangeId: string, employeeId: string, shouldRefundPoints: boolean = false): Promise<ActionResult<void>> {
  return runAction(async () => {
    await apiFetch(
      `/exchanges/cancel`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ id: exchangeId, employeeId, shouldRefundPoints }),
      },
      { redirectTo: "/login", tokenKey: "employee_token" },
    );

    updateTag("pending-exchanges-employee");
    updateTag("pending-exchanges-count");
  });
}

export async function approveExchange(exchangeId: string, employeeId: string): Promise<ActionResult<void>> {
  return runAction(async () => {
    await apiFetch(
      `/exchanges/approve`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ id: exchangeId, employeeId }),
      },
      { redirectTo: "/login", tokenKey: "employee_token" },
    );

    updateTag("pending-exchanges-employee");
    updateTag("pending-exchanges-count");
  });
}

export type LoginState = {
  error: string | null;
};

export async function login(_: LoginState, formData: FormData): Promise<LoginState> {
  const username = formData.get("username")?.toString();
  const password = formData.get("password")?.toString();

  const backendUrl = process.env.BACKEND_URL ?? "http://localhost:8080";
  const res = await fetch(`${backendUrl}/auth/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      username,
      password,
    }),
  });

  if (!res.ok) {
    return {
      error: "Usuario o contraseña incorrectos",
    };
  }

  const { token } = await res.json();

  const cookieStore = await cookies();

  cookieStore.set("employee_token", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
  });

  redirect("/");
}
