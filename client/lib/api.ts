import "server-only"
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import type { z } from "zod";
import { backendUrl } from "./backend-url";
import { getDashboardSessionToken, getSessionToken } from "./auth/session";
import { ProblemDetail } from "@/lib/types/problem-detail";

export type ActionResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string; status?: number };

/** A successful call that also keeps the raw response, e.g. to read its `Set-Cookie`. */
export type ResponseResult<T> =
  | { ok: true; data: T; response: Response }
  | { ok: false; error: string; status?: number };

export const REQUEST_FAILED_MESSAGE = "No pudimos completar la solicitud.";
const SERVICE_UNAVAILABLE_MESSAGE = "El servicio no está disponible en este momento.";

export type BackendFetchOptions<T> = {
  /** Sent as `Authorization: Bearer …` when present. */
  token?: string;
  /** Checks the JSON body at runtime. Without it, `T` is only an assertion. */
  schema?: z.ZodType<T>;
  /** Gives up after this many milliseconds; a timeout counts as "unavailable". */
  timeoutMs?: number;
  /**
   * Forwards the browser's `User-Agent` and Client Hints from the incoming request.
   * Use on calls that create a backend session, so it is labelled with the user's
   * device instead of this server's runtime ("Bun/…").
   */
  forwardDevice?: boolean;
  /** User-facing copy that replaces the defaults. */
  messages?: {
    /** A fixed message for specific HTTP statuses, e.g. `{ 401: "…" }`. */
    byStatus?: Partial<Record<number, string>>;
    /** Any other failed status. When set, the backend's `detail` is not shown. */
    failed?: string;
    /** The body did not match `schema`. */
    invalid?: string;
    /** Network error or timeout: the backend may or may not have done the work. */
    unavailable?: string;
  };
};

/**
 * The single backend call. Every helper below goes through here, so the
 * response handling — RFC 7807 `detail` for errors, empty (204) bodies, runtime
 * validation, timeouts and transport failures — lives in one place.
 */
export async function backendFetchWithResponse<T>(
  path: string,
  init?: RequestInit,
  options: BackendFetchOptions<T> = {},
): Promise<ResponseResult<T>> {
  const { token, schema, timeoutMs, messages = {}, forwardDevice } = options;

  try {
    const device = forwardDevice ? await clientDeviceHeaders() : {};
    const response = await fetch(backendUrl(path), {
      ...init,
      headers: {
        ...device,
        ...init?.headers,
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      ...(timeoutMs ? { signal: AbortSignal.timeout(timeoutMs) } : {}),
    });

    if (!response.ok) {
      return { ok: false, error: await failureMessage(response, messages), status: response.status };
    }

    const text = await response.text();
    const body: unknown = text ? JSON.parse(text) : undefined;
    if (!schema) return { ok: true, data: body as T, response };

    const parsed = schema.safeParse(body);
    if (!parsed.success) return { ok: false, error: messages.invalid ?? REQUEST_FAILED_MESSAGE };
    return { ok: true, data: parsed.data, response };
  } catch {
    return { ok: false, error: messages.unavailable ?? SERVICE_UNAVAILABLE_MESSAGE };
  }
}

const FORWARDED_DEVICE_HEADERS = ["user-agent", "sec-ch-ua", "sec-ch-ua-platform", "sec-ch-ua-mobile"] as const;
const MAX_FORWARDED_HEADER_LENGTH = 512;

/**
 * The incoming browser request's device headers. Only a display label for the
 * session list: these headers are client-controlled and grant nothing.
 */
async function clientDeviceHeaders(): Promise<Record<string, string>> {
  try {
    const incoming = await headers();
    const out: Record<string, string> = {};
    for (const name of FORWARDED_DEVICE_HEADERS) {
      const value = incoming.get(name);
      if (value) out[name] = value.slice(0, MAX_FORWARDED_HEADER_LENGTH);
    }
    return out;
  } catch {
    return {}; // outside a request scope; the backend falls back to "Dispositivo desconocido"
  }
}

/** Same as `backendFetchWithResponse`, for callers that only need the data. */
export async function backendFetch<T>(path: string, init?: RequestInit, options?: BackendFetchOptions<T>): Promise<ActionResult<T>> {
  const result = await backendFetchWithResponse(path, init, options);
  if (!result.ok) return result;
  return { ok: true, data: result.data };
}

async function failureMessage(response: Response, messages: NonNullable<BackendFetchOptions<unknown>["messages"]>): Promise<string> {
  const fixed = messages.byStatus?.[response.status] ?? messages.failed;
  if (fixed) return fixed;
  return (await readProblemDetail(response))?.detail ?? REQUEST_FAILED_MESSAGE;
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
  return backendFetch<T>(path, init, { token });
};

/** Staff credentials. Redirects to the dashboard sign-in when there is no session. */
export const dashboardRequest = async <T>(path: string, init?: RequestInit): Promise<ActionResult<T>> => {
  const token = await getDashboardSessionToken();
  if (!token) redirect("/d/sign-in");
  return backendFetch<T>(path, init, { token });
};

/** No credentials: public endpoints, never cached across users. */
export const publicRequest = async <T>(path: string, init?: RequestInit): Promise<ActionResult<T>> =>
  backendFetch<T>(path, { ...init, cache: "no-store" });
