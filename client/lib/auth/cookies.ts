/**
 * Cookie identity for the two session areas, in one place: `lib/auth/refresh.ts`
 * rotates them, `lib/auth/session.ts` verifies them and `proxy.ts` clears them,
 * so none of those modules may own the names.
 *
 * The browser keeps the two areas in separate HttpOnly cookies: the access token
 * and the backend's opaque `bb_rt`, relayed on the Next origin so browser
 * JavaScript never reads it. The two areas may hold cookies only for the same
 * account; see `enforceSingleIdentity` in `lib/auth/refresh.ts`.
 */
export const CUSTOMER_ACCESS_COOKIE = "access_token";
const CUSTOMER_REFRESH_COOKIE = "bb_user_rt";
export const DASHBOARD_ACCESS_COOKIE = "d_token";
export const DASHBOARD_REFRESH_COOKIE = "bb_dashboard_rt";
export const DASHBOARD_STOREFRONTS_COOKIE = "d_storefronts";

export type SessionArea = "customer" | "dashboard";
export const SESSION_AREAS: readonly SessionArea[] = ["customer", "dashboard"];

export const sessionCookies = {
  customer: {
    access: CUSTOMER_ACCESS_COOKIE,
    refresh: CUSTOMER_REFRESH_COOKIE,
    signIn: "/sign-in",
    /** Non-credential cookies that only make sense while the area has a session. */
    extra: [] as string[],
  },
  dashboard: {
    access: DASHBOARD_ACCESS_COOKIE,
    refresh: DASHBOARD_REFRESH_COOKIE,
    signIn: "/d/sign-in",
    extra: [DASHBOARD_STOREFRONTS_COOKIE],
  },
} satisfies Record<SessionArea, { access: string; refresh: string; signIn: string; extra: string[] }>;

export const otherArea = (area: SessionArea): SessionArea => (area === "customer" ? "dashboard" : "customer");

/** Every cookie an area owns, so no caller has to remember `d_storefronts`. */
function sessionCookieNames(area: SessionArea): string[] {
  const names = sessionCookies[area];
  return [names.access, names.refresh, ...names.extra];
}

/** Works for the request/response jars of `proxy.ts` as well as `cookies()`. */
export function deleteSessionCookies(jar: { delete: (name: string) => unknown }, area: SessionArea) {
  for (const name of sessionCookieNames(area)) jar.delete(name);
}

/** An area's two credentials, read from `cookies()` or a `proxy.ts` request jar. */
export function readAreaCookies(jar: { get: (name: string) => { value: string } | undefined }, area: SessionArea) {
  const names = sessionCookies[area];
  return { access: jar.get(names.access)?.value, refresh: jar.get(names.refresh)?.value };
}

/**
 * The header that hands a refresh token to the backend, which knows it as
 * `bb_rt`. Without a token there is no header, so callers can always spread it.
 */
export function refreshCookieHeader(token?: string): Record<string, string> {
  return token ? { Cookie: `bb_rt=${token}` } : {};
}

export const accessCookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
};

export const refreshCookieOptions = (maxAge: number) => ({
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  // The proxy can refresh on GET navigation; don't let cross-site navigation
  // send this credential and bypass the backend's POST-only CSRF header.
  sameSite: "strict" as const,
  path: "/",
  maxAge,
});
