import { backendFetch } from "@/lib/api";
import { refreshCookieHeader } from "./cookies";

/**
 * Revokes one backend session. Both credentials are sent when available: the
 * bearer token identifies the user and `bb_rt` identifies the device session to
 * drop, so a lost access token still ends the refresh session.
 */
export async function logoutFromBackend(token?: string, refreshCookie?: string): Promise<void> {
  if (!token && !refreshCookie) return;

  const result = await backendFetch<void>(
    "/auth/logout",
    {
      method: "POST",
      headers: {
        ...refreshCookieHeader(refreshCookie),
        "X-Requested-With": "XMLHttpRequest",
      },
      cache: "no-store",
    },
    { token },
  );

  if (result.ok) return;
  if (result.status) console.error("Backend logout failed:", result.status);
  else console.error("Backend logout was unavailable");
}
