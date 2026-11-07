import "server-only"
import { cookies } from "next/headers";
import { UserRole } from "@/lib/definitions";
import { checkSession, getDashboardSessionToken } from "@/lib/auth/session";
import {
  accessCookieOptions,
  DASHBOARD_ACCESS_COOKIE,
  DASHBOARD_REFRESH_COOKIE,
  refreshCookieOptions,
  refreshSession,
} from "@/lib/auth/refresh";
import { ActionResult } from "@/lib/api";

/**
 * The one ADMIN guard for billing. Pages, server actions and the invoice route
 * each have to enforce their own authorization — a layout check does not cover
 * them — so this is where that check lives, for the dashboard and the onboarding
 * payment step alike.
 *
 * An expired access token is renewed here: a server action is not routed through
 * `proxy.ts`, so a request that raced the token's expiry would otherwise fail
 * while the browser still holds a usable refresh cookie. The distinction between
 * expired, invalid and temporarily unverifiable is preserved, because only the
 * last one is worth retrying.
 */
export async function billingAdminToken(): Promise<ActionResult<string>> {
  // One cookie read, then one verification of exactly that token.
  let token = await getDashboardSessionToken();
  let session = await checkSession(token, "dashboard");

  if (!token || session.status === "expired") {
    const renewed = await renewDashboardSession();
    if (renewed.status === "unavailable") {
      return { ok: false, status: 503, error: "No pudimos renovar tu sesión. Esperá un minuto y reintentá." };
    }
    if (renewed.status === "renewed") {
      token = renewed.token;
      session = renewed.session;
    }
  }

  if (session.status === "unavailable") {
    return { ok: false, status: 503, error: "No pudimos verificar tu sesión. Reintentá en un momento." };
  }
  if (!token || session.status !== "valid") {
    return { ok: false, status: 401, error: "Tu sesión terminó. Volvé a ingresar a tu negocio." };
  }
  if (session.payload.role !== UserRole.ADMIN) {
    return { ok: false, status: 403, error: "Necesitás una cuenta administradora de este negocio." };
  }
  return { ok: true, data: token };
}

type Renewal =
  | { status: "renewed"; token: string; session: Awaited<ReturnType<typeof checkSession>> }
  /** Nothing to renew, or the refresh token itself is gone. */
  | { status: "none" }
  | { status: "unavailable" };

async function renewDashboardSession(): Promise<Renewal> {
  const jar = await cookies();
  const raw = jar.get(DASHBOARD_REFRESH_COOKIE)?.value;
  if (!raw) return { status: "none" };

  const refreshed = await refreshSession(raw);
  if (refreshed.status === "expired") return { status: "none" };
  if (refreshed.status !== "ok") return { status: "unavailable" };

  // Rotation already happened upstream: store the new refresh cookie even if the
  // verification key is momentarily unreachable, or the next call replays it.
  jar.set(DASHBOARD_REFRESH_COOKIE, refreshed.cookie.value, refreshCookieOptions(refreshed.cookie.maxAge));
  const session = await checkSession(refreshed.token, "dashboard");
  if (session.status === "valid") jar.set(DASHBOARD_ACCESS_COOKIE, refreshed.token, accessCookieOptions);
  return { status: "renewed", token: refreshed.token, session };
}
