"use server";

import { ActionResult, runAction } from "@/lib/action-result";
import { ApiError } from "@/lib/api-error";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type {
  CustomerPointsAward,
  FormState,
  HomeStats,
  LoginState,
  Organization,
  PendingExchangeReview,
  PointAction,
  TopClient,
  TopReward,
} from "@/app/[orgId]/dashboard/types";
import { Customer } from "@/lib/definitions";
import { createCustomerSchema } from "@/schemas/customer";
import { flattenZodErrors } from "@/lib/utils";

const apiFetch = async (path: string, reqArgs?: RequestInit) => {
  const cookiesStore = await cookies();
  const token = cookiesStore.get("employee_token")?.value;

  // TODO: we will use slug org id in the future, so this should redirect to /[org-id]/sign-in
  if (!token) redirect("/sign-in", "replace");

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

export const getOrganization = async (): Promise<Organization> => {
  const response = await apiFetch("/organization");
  return await response.json();
};

// TODO: this action points to a unexisting endpoint in the backend. Should implement this before trying to run the app again.
export const getAllPointActions = async (id?: string): Promise<PointAction[]> => {
  const params = new URLSearchParams();
  // Note: only need the last 10 since we are not implementing pagination for now.
  params.append("size", "10");
  if (id) params.append("of", id);

  const response = await apiFetch(`/customers/grant/history?${params}`);
  return await response.json();
};

// TODO: this should return a customer with points, but we will implement it later.
type CustomerWithNoPoints = Omit<Customer, "points">;

export const getAllCustomers = async (query?: string, page: number = 0): Promise<CustomerWithNoPoints[]> => {
  const params = new URLSearchParams();
  // Note: only need the last 10 since we are not implementing pagination for now.
  params.append("size", "10");
  params.append("page", page.toString());
  if (query && query.trim()) params.append("search", query);

  const response = await apiFetch(`/customers?${params}`);
  return await response.json();
};

export const grantPointsTo = async (id: string, points: number): Promise<ActionResult<CustomerPointsAward>> => {
  return runAction(async () => {
    const response = await apiFetch("/customers/grant", {
      method: "POST",
      body: JSON.stringify({ customerId: id, points }),
      headers: { "Content-Type": "application/json" },
    });
    return await response.json();
  });
};

export const updateOrganization = async (_: FormState, formData: FormData): Promise<FormState> => {
  const newValues = {
    name: formData.get("org-name"),
    icon: formData.get("org-icon"),
    hours: formData.get("org-hours"),
    address: formData.get("org-address"),
    description: formData.get("org-desc"),
  };

  const res = await apiFetch("/organization", {
    body: JSON.stringify({ ...newValues }),
    headers: { "Content-Type": "application/json" },
    method: "POST",
  });

  if (!res.ok) {
    return {
      message: "Hubo un error tratando de actualizar los datos.",
      status: "error",
    };
  }

  return {
    status: "success",
    message: "Datos actualizados con éxito.",
  };
};

export async function createCustomer(_: FormState, formData: FormData): Promise<FormState> {
  const parsed = createCustomerSchema.safeParse({
    name: formData.get("name"),
    phone: formData.get("phone"),
    points: formData.get("points"),
  });

  if (!parsed.success) {
    return {
      status: "error",
      message: flattenZodErrors(parsed.error)[0],
    };
  }

  const result = await runAction<Customer>(async () => {
    const response = await apiFetch("/customers", {
      method: "POST",
      body: JSON.stringify(parsed.data),
      headers: { "Content-Type": "application/json" },
    });
    return await response.json();
  });

  if (!result.ok) {
    return {
      status: "error",
      message: result.error,
    };
  }

  return {
    status: "success",
    message: "Cliente registrado con éxito.",
  };
}

export async function getHomeStats(): Promise<HomeStats> {
  const response = await apiFetch("/employees/home-stats");
  const data = await response.json();

  return data;
}

export async function getPendingExchanges(): Promise<PendingExchangeReview[]> {
  // self-reminder: I should probably consider implementing tanstack query to handle UI updates on data mutation and server state.
  // As this app grows, it's becoming hard to manage this type of updates properly without missing any tags.
  const response = await apiFetch("/exchanges/pending", { next: { tags: ["pending-exchanges-employee"] } });

  const data = await response.json();
  return data;
}

export async function getTopRewards(): Promise<TopReward[]> {
  const response = await apiFetch("/rewards/top");

  const data = await response.json();
  return data;
}

export async function getTopClients(): Promise<TopClient[]> {
  const response = await apiFetch("/customers/top");

  const data = await response.json();
  return data;
}

export async function reactivateCustomer(id: string): Promise<ActionResult<Customer>> {
  return runAction(async () => {
    const response = await apiFetch(`/customers/${id}/reactivate`, { method: "PATCH" });
    return await response.json();
  });
}

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

  redirect("/1234/dashboard");
}
