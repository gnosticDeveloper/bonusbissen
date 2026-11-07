"use server";

import { ActionResult, request } from "@/lib/api";
import { clearAllSessions, CUSTOMER_ACCESS_COOKIE, CUSTOMER_REFRESH_COOKIE, deleteSessionCookies } from "@/lib/auth/refresh";
import { UserInfo } from "@/lib/types/customer";
import { validateImageUpload } from "@/lib/image-upload";
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

export async function updateProfile(input: { name: string; email: string }): Promise<ActionResult<UserInfo>> {
  const result = await request<UserInfo>("/users/me", {
    method: "PATCH",
    body: JSON.stringify({ name: input.name.trim(), email: input.email.trim() || null }),
    headers: { "Content-Type": "application/json" },
  });
  if (result.ok) revalidatePath("/b/perfil");
  return result;
}

export async function uploadAvatar(formData: FormData): Promise<ActionResult<string | null>> {
  const image = formData.get("image");
  if (!(image instanceof File)) return { ok: false, error: "Seleccioná una imagen para tu perfil." };
  const error = validateImageUpload(image);
  if (error) return { ok: false, error };

  const body = new FormData();
  body.set("image", image);
  const result = await request<UserInfo>("/users/me/avatar", { method: "POST", body });
  if (!result.ok) return result;
  revalidatePath("/b/perfil");
  return { ok: true, data: result.data?.avatarUrl ?? null };
}

export async function updatePassword(input: { currentPassword: string; newPassword: string }): Promise<ActionResult<void>> {
  return request<void>("/users/me/password", {
    method: "PATCH",
    body: JSON.stringify(input),
    headers: { "Content-Type": "application/json" },
  });
}

/** Re-send the email verification message to the logged-in customer's address. */
export async function resendVerificationEmail(): Promise<ActionResult<void>> {
  return request<void>("/users/me/resend-verification", { method: "POST", cache: "no-store" });
}

export async function getDeviceSessions(): Promise<ActionResult<DeviceSession[]>> {
  const cookieStore = await cookies();
  const token = cookieStore.get(CUSTOMER_ACCESS_COOKIE)?.value;
  if (!token) return { ok: false, error: "Necesitás iniciar sesión." };

  const refreshToken = cookieStore.get(CUSTOMER_REFRESH_COOKIE)?.value;
  return request<DeviceSession[]>("/auth/sessions", {
    cache: "no-store",
    headers: refreshToken ? { Cookie: `bb_rt=${refreshToken}` } : undefined,
  });
}

export async function revokeDeviceSession(sessionId: string, current: boolean): Promise<ActionResult<void>> {
  if (typeof sessionId !== "string" || !UUID_PATTERN.test(sessionId)) {
    return { ok: false, error: "La sesión no es válida." };
  }

  const result = await request<void>(`/auth/sessions/${sessionId}`, { method: "DELETE", cache: "no-store" });
  if (result.ok && current) deleteSessionCookies(await cookies(), "customer");
  return result;
}

/**
 * The backend revoked every session of this account, so no cookie left in this
 * browser can still be valid: both areas only ever hold the same identity.
 */
export async function revokeAllDeviceSessions(): Promise<ActionResult<void>> {
  const result = await request<void>("/auth/sessions", { method: "DELETE", cache: "no-store" });
  if (result.ok) await clearAllSessions();
  return result;
}

/**
 * Deactivate the logged-in customer's account (soft delete). On success the
 * session cookie is cleared so the caller can redirect to sign-in.
 */
export async function deleteAccount(): Promise<ActionResult<void>> {
  const result = await request<void>("/users/me", { method: "DELETE", cache: "no-store" });
  if (result.ok) deleteSessionCookies(await cookies(), "customer");
  return result;
}
