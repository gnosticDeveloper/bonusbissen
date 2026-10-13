import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getDashboardSessionToken } from "./auth/session";
import { ProblemDetail } from "./definitions";

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

export type ActionResult<T> = { ok: true; data: T } | { ok: false; error: string; status?: number };

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
    });
    if (!response.ok) {
      const rawResponse = await response.text();
      let problemDetail: ProblemDetail | null;
      try {
        problemDetail = JSON.parse(rawResponse);
      } catch {
        problemDetail = null;
      }
      return { ok: false, error: problemDetail?.detail ?? "No pudimos completar la solicitud." };
    }
    const text = await response.text();
    return { ok: true, data: (text ? JSON.parse(text) : undefined) as T };
  } catch {
    return { ok: false, error: "El servicio no está disponible en este momento." };
  }
};

export const dashboardRequest = async <T>(path: string, init?: RequestInit): Promise<ActionResult<T>> => {
  const token = await getDashboardSessionToken();

  if (!token) redirect("/d/sign-in");

  const backendUrl = process.env.BACKEND_URL ?? "http://localhost:8080";
  try {
    const response = await fetch(`${backendUrl}${path}`, {
      ...init,
      headers: {
        ...init?.headers,
        Authorization: `Bearer ${token}`,
      },
    });
    if (!response.ok) {
      const rawResponse = await response.text();
      let problemDetail: ProblemDetail | null;
      try {
        problemDetail = JSON.parse(rawResponse);
      } catch {
        problemDetail = null;
      }
      return { ok: false, error: problemDetail?.detail ?? "No pudimos completar la solicitud.", status: response.status };
    }
    const text = await response.text();
    return { ok: true, data: (text ? JSON.parse(text) : undefined) as T };
  } catch {
    return { ok: false, error: "El servicio no está disponible en este momento." };
  }
};

export const publicRequest = async <T>(path: string, init?: RequestInit): Promise<ActionResult<T>> => {
  const backendUrl = process.env.BACKEND_URL ?? "http://localhost:8080";

  try {
    const response = await fetch(`${backendUrl}${path}`, {
      ...init,
      headers: {
        ...init?.headers,
      },
      cache: "no-store",
    });

    if (!response.ok) return { ok: false, error: "No pudimos completar la solicitud." };

    const text = await response.text();
    return { ok: true, data: (text ? JSON.parse(text) : undefined) as T };
  } catch {
    return { ok: false, error: "El servicio no está disponible en este momento." };
  }
};
