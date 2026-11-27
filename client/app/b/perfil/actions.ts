"use server";

import { ActionResult, request } from "@/lib/api";
import { deleteSessionCookies, readAreaCookies, refreshCookieHeader } from "@/lib/auth/cookies";
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
  const { access, refresh } = readAreaCookies(await cookies(), "customer");
  if (!access) return { ok: false, error: "Necesitás iniciar sesión." };

  return request<DeviceSession[]>("/auth/sessions", {
    cache: "no-store",
    headers: refreshCookieHeader(refresh),
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
 * Revokes every session of this account except the one in this browser. The list is
 * re-read here rather than taken from the client, and nothing is revoked unless the
 * backend recognises this browser's session, so the current one can never be among them.
 */
export async function revokeOtherDeviceSessions(): Promise<ActionResult<void>> {
  const sessions = await getDeviceSessions();
  if (!sessions.ok) return sessions;
  if (!sessions.data.some((session) => session.current)) {
    return { ok: false, error: "No pudimos identificar este dispositivo. Volvé a iniciar sesión y probá de nuevo." };
  }

  const others = sessions.data.filter((session) => !session.current && UUID_PATTERN.test(session.id));
  const results = await Promise.all(
    others.map((session) => request<void>(`/auth/sessions/${session.id}`, { method: "DELETE", cache: "no-store" })),
  );
  const failed = results.filter((result) => !result.ok).length;
  if (failed === 0) return { ok: true, data: undefined };
  return {
    ok: false,
    error: failed === results.length ? "No pudimos cerrar las sesiones. Probá de nuevo." : "No pudimos cerrar algunas sesiones. Probá de nuevo.",
  };
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
