export async function logoutFromBackend(token?: string, refreshCookie?: string): Promise<void> {
  if (!token && !refreshCookie) return;

  try {
    const backendUrl = process.env.BACKEND_URL ?? "http://localhost:8080";
    const response = await fetch(`${backendUrl}/auth/logout`, {
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
