"use server";

import { ActionResult } from "@/lib/api";
import { SignInUser } from "@/lib/definitions";
import { userLoginSchema } from "@/schemas/user";
import { saveCustomerSession } from "@/lib/auth/refresh";
import { z } from "zod";

export async function signIn(formData: FormData): Promise<ActionResult<SignInUser>> {
  const raw = {
    identifier: String(formData.get("identifier") ?? ""),
    password: String(formData.get("password") ?? ""),
  };

  const parsed = userLoginSchema.safeParse(raw);
  if (!parsed.success) {
    const firstError = parsed.error.issues[0]?.message ?? "Revisá los datos ingresados.";
    return { ok: false, error: firstError };
  }

  const { identifier, password } = parsed.data;
  const backendUrl = process.env.BACKEND_URL ?? "http://localhost:8080";

  try {
    const response = await fetch(`${backendUrl}/auth/user-login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ identifier, password }),
    });

    if (!response.ok) return { ok: false, error: "No pudimos completar la solicitud." };

    const result = (await response.json()) as { token: string };
    if (!(await saveCustomerSession(response, result.token))) return { ok: false, error: "No pudimos iniciar sesión. Probá de nuevo." };
    return { ok: true, data: { name: identifier, avatarUrl: null } };
  } catch {
    return { ok: false, error: "El servicio no está disponible en este momento." };
  }
}

export async function requestLoginLink(email: string): Promise<ActionResult<null>> {
  const parsed = z.email().max(255).safeParse(typeof email === "string" ? email.trim() : "");
  if (!parsed.success) return { ok: false, error: "Ingresá un email válido." };

  const backendUrl = process.env.BACKEND_URL ?? "http://localhost:8080";
  try {
    const response = await fetch(`${backendUrl}/auth/user-login-link/request`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: parsed.data }),
      cache: "no-store",
    });
    if (!response.ok) return { ok: false, error: "No pudimos enviar el enlace. Probá de nuevo." };
    return { ok: true, data: null };
  } catch {
    return { ok: false, error: "El servicio no está disponible en este momento." };
  }
}

export async function consumeLoginLink(token: string): Promise<ActionResult<null>> {
  if (typeof token !== "string" || !/^[A-Za-z0-9_-]{43}$/.test(token)) {
    return { ok: false, error: "El enlace no es válido o venció. Pedí uno nuevo." };
  }

  const backendUrl = process.env.BACKEND_URL ?? "http://localhost:8080";
  try {
    const response = await fetch(`${backendUrl}/auth/user-login-link/consume`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
      cache: "no-store",
    });
    if (!response.ok) return { ok: false, error: "El enlace no es válido o venció. Pedí uno nuevo." };
    const { token: accessToken } = (await response.json()) as { token: string };
    if (!(await saveCustomerSession(response, accessToken))) return { ok: false, error: "No pudimos iniciar sesión. Probá de nuevo." };
    return { ok: true, data: null };
  } catch {
    return { ok: false, error: "El servicio no está disponible en este momento." };
  }
}
