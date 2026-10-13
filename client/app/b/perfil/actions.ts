"use server";

import { ActionResult } from "@/lib/action-result";
import { request } from "@/lib/api";
import { verifySession } from "@/lib/auth/session";
import { CUSTOMER_REFRESH_COOKIE } from "@/lib/auth/refresh";
import { UserInfo } from "@/lib/types/customer";
import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";

export type DeviceSession = {
  id: string;
  device: string;
  createdAt: string;
  lastUsedAt: string;
  current: boolean;
};

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Authed call that tolerates an empty (204) body — the shared `request` helper
 * in `@/lib/api` assumes a JSON payload, which these endpoints don't return.
 */
async function mutate(path: string, method: "POST" | "DELETE"): Promise<ActionResult<null>> {
  const token = (await cookies()).get("access_token")?.value;
  if (!token) return { ok: false, error: "Necesitás iniciar sesión." };

  const backendUrl = process.env.BACKEND_URL ?? "http://localhost:8080";

  try {
    const response = await fetch(`${backendUrl}${path}`, {
      method,
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });

    if (!response.ok) {
      const body = (await response.json().catch(() => null)) as { detail?: string; error?: string } | null;
      return { ok: false, error: body?.detail ?? body?.error ?? "No pudimos completar la solicitud." };
    }

    return { ok: true, data: null };
  } catch {
    return { ok: false, error: "El servicio no está disponible en este momento." };
  }
}

export async function updateProfile(input: { name: string; email: string }): Promise<ActionResult<UserInfo>> {
  const result = await request<UserInfo>("/users/me", {
    method: "PATCH",
    body: JSON.stringify({ name: input.name.trim(), email: input.email.trim() || null }),
    headers: { "Content-Type": "application/json" },
  });
  if (result.ok) revalidatePath("/b/perfil");
  return result;
}

export async function updatePassword(input: { currentPassword: string; newPassword: string }): Promise<ActionResult<void>> {
  return request<void>("/users/me/password", {
    method: "PATCH",
    body: JSON.stringify(input),
    headers: { "Content-Type": "application/json" },
  });
}

/** Re-send the email verification message to the logged-in customer's address. */
export async function resendVerificationEmail(): Promise<ActionResult<null>> {
  return mutate("/users/me/resend-verification", "POST");
}

export async function getDeviceSessions(): Promise<ActionResult<DeviceSession[]>> {
  const cookieStore = await cookies();
  const token = cookieStore.get("access_token")?.value;
  if (!token) return { ok: false, error: "Necesitás iniciar sesión." };

  const refreshToken = cookieStore.get(CUSTOMER_REFRESH_COOKIE)?.value;
  return request<DeviceSession[]>("/auth/sessions", {
    cache: "no-store",
    headers: refreshToken ? { Cookie: `bb_rt=${refreshToken}` } : undefined,
  });
}

export async function revokeDeviceSession(sessionId: string, current: boolean): Promise<ActionResult<null>> {
  if (typeof sessionId !== "string" || !UUID_PATTERN.test(sessionId)) {
    return { ok: false, error: "La sesión no es válida." };
  }

  const result = await mutate(`/auth/sessions/${sessionId}`, "DELETE");
  if (result.ok && current) {
    const cookieStore = await cookies();
    cookieStore.delete("access_token");
    cookieStore.delete(CUSTOMER_REFRESH_COOKIE);
  }
  return result;
}

export async function revokeAllDeviceSessions(): Promise<ActionResult<null>> {
  const cookieStore = await cookies();
  const customerToken = cookieStore.get("access_token")?.value;
  const dashboardToken = cookieStore.get("d_token")?.value;
  const result = await mutate("/auth/sessions", "DELETE");
  if (result.ok) {
    cookieStore.delete("access_token");
    cookieStore.delete(CUSTOMER_REFRESH_COOKIE);
    if (customerToken && dashboardToken) {
      const [customer, dashboard] = await Promise.all([verifySession(customerToken), verifySession(dashboardToken, "dashboard")]);
      if (customer?.sub && dashboard?.sub === customer.sub) cookieStore.delete("d_token");
    }
  }
  return result;
}

/**
 * Deactivate the logged-in customer's account (soft delete). On success the
 * session cookie is cleared so the caller can redirect to sign-in.
 */
export async function deleteAccount(): Promise<ActionResult<null>> {
  const result = await mutate("/users/me", "DELETE");
  if (result.ok) {
    const cookieStore = await cookies();
    cookieStore.delete("access_token");
    cookieStore.delete(CUSTOMER_REFRESH_COOKIE);
  }
  return result;
}
