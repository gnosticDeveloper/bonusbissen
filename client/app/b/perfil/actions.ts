"use server";

import { ActionResult } from "@/lib/action-result";
import { cookies } from "next/headers";

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
      const body = (await response.json().catch(() => null)) as { error?: string } | null;
      return { ok: false, error: body?.error ?? "No pudimos completar la solicitud." };
    }

    return { ok: true, data: null };
  } catch {
    return { ok: false, error: "El servicio no está disponible en este momento." };
  }
}

/** Re-send the email verification message to the logged-in customer's address. */
export async function resendVerificationEmail(): Promise<ActionResult<null>> {
  return mutate("/users/me/resend-verification", "POST");
}

/**
 * Deactivate the logged-in customer's account (soft delete). On success the
 * session cookie is cleared so the caller can redirect to sign-in.
 */
export async function deleteAccount(): Promise<ActionResult<null>> {
  const result = await mutate("/users/me", "DELETE");
  if (result.ok) (await cookies()).delete("access_token");
  return result;
}
