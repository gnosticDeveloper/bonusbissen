import { cookies } from "next/headers";
import { backendUrl } from "@/lib/backend-url";
import { checkSession, decodeJwt } from "./session";
import { logoutFromBackend } from "./logout";
import {
  accessCookieOptions,
  deleteSessionCookies,
  otherArea,
  refreshCookieOptions,
  SESSION_AREAS,
  sessionCookies,
  type SessionArea,
} from "./cookies";

// Re-exported so `@/lib/auth/refresh` stays the entry point for session cookies.
export {
  accessCookieOptions,
  CUSTOMER_ACCESS_COOKIE,
  CUSTOMER_REFRESH_COOKIE,
  DASHBOARD_ACCESS_COOKIE,
  DASHBOARD_REFRESH_COOKIE,
  DASHBOARD_STOREFRONTS_COOKIE,
  deleteSessionCookies,
  refreshCookieOptions,
  SESSION_AREAS,
  sessionCookies,
  type SessionArea,
} from "./cookies";

export type RefreshCookie = { value: string; maxAge: number };

export function readBackendRefreshCookie(response: Response): RefreshCookie | null {
  const header = response.headers.get("set-cookie");
  const value = /^bb_rt=([A-Za-z0-9_-]+)(?:;|$)/.exec(header ?? "")?.[1];
  const maxAge = /(?:^|;)\s*Max-Age=(\d+)/i.exec(header ?? "")?.[1];
  if (!value || !maxAge || Number(maxAge) <= 0) return null;
  return { value, maxAge: Number(maxAge) };
}

/**
 * One browser holds one identity. The customer and dashboard cookies are
 * separate because onboarding genuinely needs both for the *same* person
 * (`app/onboarding/dashboard-session.ts` trades one for the other), but every
 * place that reads the pair already treats two different accounts as an error.
 * Signing in therefore ends whatever the other area was holding for somebody
 * else, instead of leaving two accounts open on the same device.
 *
 * The incoming token is only *decoded* to compare subjects: this decides which
 * cookies to keep, never what the session may do, and it comes straight from the
 * backend's response. A token that cannot be read identifies nobody, so the
 * other area is cleared.
 */
async function enforceSingleIdentity(area: SessionArea, token: string) {
  const subject = subjectOf(token);
  const other = otherArea(area);
  const names = sessionCookies[other];
  const jar = await cookies();
  const existing = jar.get(names.access)?.value;
  const refresh = jar.get(names.refresh)?.value;
  if (!existing && !refresh) return;

  const session = await checkSession(existing, other);
  if (subject && session.status === "valid" && session.payload.sub === subject) return;
  // Revoke the backend session as well, so its refresh token cannot keep issuing
  // access tokens for an account that no longer has a session in this browser.
  // An unverifiable session is dropped locally but left alone upstream: we cannot
  // prove whose it is, and a verification outage must not revoke a live session.
  if (session.status === "valid") await logoutFromBackend(existing, refresh);
  deleteSessionCookies(jar, other);
}

function subjectOf(token: string): string | null {
  try {
    return decodeJwt(token).sub || null;
  } catch {
    return null;
  }
}

export async function saveCustomerSession(response: Response, token: string): Promise<boolean> {
  const refresh = readBackendRefreshCookie(response);
  if (!refresh || !token) return false;
  await enforceSingleIdentity("customer", token);
  const cookieStore = await cookies();
  cookieStore.set(sessionCookies.customer.refresh, refresh.value, refreshCookieOptions(refresh.maxAge));
  cookieStore.set(sessionCookies.customer.access, token, accessCookieOptions);
  return true;
}

export async function saveDashboardSession(response: Response, token: string): Promise<boolean> {
  const refresh = readBackendRefreshCookie(response);
  if (!refresh || (await checkSession(token, "dashboard")).status !== "valid") return false;
  await enforceSingleIdentity("dashboard", token);
  const cookieStore = await cookies();
  cookieStore.set(sessionCookies.dashboard.refresh, refresh.value, refreshCookieOptions(refresh.maxAge));
  cookieStore.set(sessionCookies.dashboard.access, token, accessCookieOptions);
  return true;
}

/**
 * Ends every session this browser holds: revokes each area's backend session and
 * deletes its cookies. Because the two areas can only ever hold one identity,
 * signing out of either one means that person is leaving the device — leaving the
 * other area signed in is what used to keep a session alive after "cerrar sesión".
 */
export async function clearAllSessions(): Promise<void> {
  const jar = await cookies();
  await Promise.all(
    SESSION_AREAS.map((area) => {
      const names = sessionCookies[area];
      return logoutFromBackend(jar.get(names.access)?.value, jar.get(names.refresh)?.value);
    }),
  );
  for (const area of SESSION_AREAS) deleteSessionCookies(jar, area);
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

export async function refreshSession(rawCookie: string): Promise<RefreshResult> {
  // Only forward the backend's opaque base64url token, never arbitrary cookie/header input.
  if (!/^[A-Za-z0-9_-]{43}$/.test(rawCookie)) return { status: "expired" };
  const inFlight = pending.get(rawCookie);
  if (inFlight) return inFlight;
  if (Date.now() < (recentlyRotated.get(rawCookie) ?? 0)) return { status: "retry" };

  // A network failure may happen *after* Redis rotated the cookie. Block another
  // attempt until its replay-detection window expires rather than revoke all devices.
  recentlyRotated.set(rawCookie, Date.now() + 65_000);
  setTimeout(() => recentlyRotated.delete(rawCookie), 65_000).unref?.();
  const task = (async (): Promise<RefreshResult> => {
    try {
      const response = await fetch(backendUrl("/auth/refresh"), {
        method: "POST",
        headers: { Cookie: `bb_rt=${rawCookie}`, "X-Requested-With": "XMLHttpRequest" },
        cache: "no-store",
        redirect: "error",
        signal: AbortSignal.timeout(10_000),
      });
      if (response.status === 401) return { status: "expired" };
      if (!response.ok) return { status: "unavailable" };

      const { token } = (await response.json()) as { token?: string };
      const cookie = readBackendRefreshCookie(response);
      if (typeof token !== "string" || !token || !cookie) return { status: "unavailable" };
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
