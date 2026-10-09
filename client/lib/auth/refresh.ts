import { cookies } from "next/headers";

// The backend's bb_rt is relayed as an opaque, HttpOnly cookie on the Next origin.
// Browser JavaScript never reads it, and server-side fetch does not manage cookies automatically.
export const CUSTOMER_REFRESH_COOKIE = "bb_user_rt";
export const CUSTOMER_ACCESS_COOKIE = "access_token";

export type RefreshCookie = { value: string; maxAge: number };

export function readBackendRefreshCookie(response: Response): RefreshCookie | null {
  const header = response.headers.get("set-cookie");
  const value = /^bb_rt=([A-Za-z0-9_-]+)(?:;|$)/.exec(header ?? "")?.[1];
  const maxAge = /(?:^|;)\s*Max-Age=(\d+)/i.exec(header ?? "")?.[1];
  if (!value || !maxAge || Number(maxAge) <= 0) return null;
  return { value, maxAge: Number(maxAge) };
}

export const refreshCookieOptions = (maxAge: number) => ({
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  // The proxy can refresh on GET navigation; don't let cross-site navigation
  // send this credential and bypass the backend's POST-only CSRF header.
  sameSite: "strict" as const,
  path: "/",
  maxAge,
});

export const accessCookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
};

export async function saveCustomerSession(response: Response, token: string): Promise<boolean> {
  const refresh = readBackendRefreshCookie(response);
  if (!refresh || !token) return false;
  const cookieStore = await cookies();
  cookieStore.set(CUSTOMER_REFRESH_COOKIE, refresh.value, refreshCookieOptions(refresh.maxAge));
  cookieStore.set(CUSTOMER_ACCESS_COOKIE, token, accessCookieOptions);
  return true;
}

type RefreshResult =
  | { status: "ok"; token: string; cookie: RefreshCookie }
  | { status: "expired" }
  | { status: "unavailable" }
  | { status: "retry" };

// Coalesce simultaneous calls in one server process; don't replay a just-rotated
// cookie to Redis, where reuse would revoke every session for this user.
const pending = new Map<string, Promise<RefreshResult>>();
const recentlyRotated = new Map<string, number>();

export async function refreshCustomerSession(rawCookie: string): Promise<RefreshResult> {
  const inFlight = pending.get(rawCookie);
  if (inFlight) return inFlight;
  if (Date.now() < (recentlyRotated.get(rawCookie) ?? 0)) return { status: "retry" };

  // A network failure may happen *after* Redis rotated the cookie. Block another
  // attempt until its replay-detection window expires rather than revoke all devices.
  recentlyRotated.set(rawCookie, Date.now() + 65_000);
  setTimeout(() => recentlyRotated.delete(rawCookie), 65_000).unref?.();
  const task = (async (): Promise<RefreshResult> => {
    try {
      const backendUrl = process.env.BACKEND_URL ?? "http://localhost:8080";
      const response = await fetch(`${backendUrl}/auth/refresh`, {
        method: "POST",
        headers: { Cookie: `bb_rt=${rawCookie}`, "X-Requested-With": "XMLHttpRequest" },
        cache: "no-store",
      });
      if (response.status === 401) return { status: "expired" };
      if (!response.ok) return { status: "unavailable" };


      const { token } = (await response.json()) as { token?: string };
      const cookie = readBackendRefreshCookie(response);
      if (!token || !cookie) return { status: "unavailable" };
      return { status: "ok", token, cookie };
    } catch {
      return { status: "unavailable" };
    }
  })();
  pending.set(rawCookie, task);
  try {
    return await task;
  } finally {
    pending.delete(rawCookie);
  }
}
