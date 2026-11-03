import { redirect } from "next/navigation";
import { backendUrl } from "./backend-url";
import { getDashboardSessionToken, getSessionToken } from "./auth/session";
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

// One shape for every expected failure in the app; `runAction` adds the ApiError fields.
export type { ActionResult } from "./action-result";
import type { ActionResult } from "./action-result";

/**
 * The single backend call. The three wrappers below differ only in which
 * credential they attach, so the response handling — RFC 7807 `detail` for
 * errors, empty-body tolerance, transport failures — lives here once.
 *
 * The generic only *asserts* the response type; nothing is validated. Use
 * `lib/billing-api.ts` where the payload must be checked at runtime.
 */
async function backendFetch<T>(path: string, init: RequestInit | undefined, token?: string): Promise<ActionResult<T>> {
  try {
    const response = await fetch(backendUrl(path), {
      ...init,
      headers: {
        ...init?.headers,
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });

    if (!response.ok) {
      const problemDetail = await readProblemDetail(response);
      return { ok: false, error: problemDetail?.detail ?? "No pudimos completar la solicitud.", status: response.status };
    }

    const text = await response.text();
    return { ok: true, data: (text ? JSON.parse(text) : undefined) as T };
  } catch {
    return { ok: false, error: "El servicio no está disponible en este momento." };
  }
}

async function readProblemDetail(response: Response): Promise<ProblemDetail | null> {
  try {
    return JSON.parse(await response.text()) as ProblemDetail;
  } catch {
    return null;
  }
}

/** Customer credentials. Redirects to sign-in when the browser has no session. */
export const request = async <T>(path: string, init?: RequestInit): Promise<ActionResult<T>> => {
  const token = await getSessionToken();
  if (!token) redirect("/sign-in");
  return backendFetch<T>(path, init, token);
};

/** Staff credentials. Redirects to the dashboard sign-in when there is no session. */
export const dashboardRequest = async <T>(path: string, init?: RequestInit): Promise<ActionResult<T>> => {
  const token = await getDashboardSessionToken();
  if (!token) redirect("/d/sign-in");
  return backendFetch<T>(path, init, token);
};

/** No credentials: public endpoints, never cached across users. */
export const publicRequest = async <T>(path: string, init?: RequestInit): Promise<ActionResult<T>> =>
  backendFetch<T>(path, { ...init, cache: "no-store" });
