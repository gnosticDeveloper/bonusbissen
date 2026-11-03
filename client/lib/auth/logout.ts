import { backendUrl } from "@/lib/backend-url";

/**
 * Revokes one backend session. Both credentials are sent when available: the
 * bearer token identifies the user and `bb_rt` identifies the device session to
 * drop, so a lost access token still ends the refresh session.
 */
export async function logoutFromBackend(token?: string, refreshCookie?: string): Promise<void> {
  if (!token && !refreshCookie) return;

  try {
    const response = await fetch(backendUrl("/auth/logout"), {
      method: "POST",
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(refreshCookie ? { Cookie: `bb_rt=${refreshCookie}` } : {}),
        "X-Requested-With": "XMLHttpRequest",
      },
      cache: "no-store",
    });
    if (!response.ok) console.error("Backend logout failed:", response.status);
  } catch {
    console.error("Backend logout was unavailable");
  }
}
