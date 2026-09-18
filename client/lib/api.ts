import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export class ApiError extends Error {
  code?: string;
  customerId?: string;

  constructor(message: string, extra?: { code?: string; customerId?: string }) {
    super(message);
    this.name = "ApiError";
    this.code = extra?.code;
    this.customerId = extra?.customerId;
  }
}

export type ActionResult<T> = { ok: true; data: T } | { ok: false; error: string };

export const request = async <T>(path: string, init?: RequestInit): Promise<ActionResult<T>> => {
  const cookiesStore = await cookies();
  const token = cookiesStore.get("access_token")?.value;

  if (!token) redirect("/sign-in");

  const backendUrl = process.env.BACKEND_URL ?? "http://localhost:8080";
  try {
    const response = await fetch(`${backendUrl}${path}`, {
      ...init,
      headers: {
        ...init?.headers,
        Authorization: `Bearer ${token}`,
      },
      cache: "no-store",
    });
    if (!response.ok) return { ok: false, error: "No pudimos completar la solicitud." };
    return { ok: true, data: (await response.json()) as T };
  } catch {
    return { ok: false, error: "El servicio no está disponible en este momento." };
  }
};

export const dashboardRequest = async <T>(path: string, init?: RequestInit): Promise<ActionResult<T>> => {
  const cookiesStore = await cookies();
  const token = cookiesStore.get("d_token")?.value;

  if (!token) redirect("/sign-in");

  const backendUrl = process.env.BACKEND_URL ?? "http://localhost:8080";
  try {
    const response = await fetch(`${backendUrl}${path}`, {
      ...init,
      headers: {
        ...init?.headers,
        Authorization: `Bearer ${token}`,
      },
      cache: "no-store",
    });
    if (!response.ok) return { ok: false, error: "No pudimos completar la solicitud." };
    return { ok: true, data: (await response.json()) as T };
  } catch {
    return { ok: false, error: "El servicio no está disponible en este momento." };
  }
};
