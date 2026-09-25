"use server";

import { ActionResult } from "@/lib/api";
import { SignInUser } from "@/lib/definitions";
import { userLoginSchema } from "@/schemas/user";
import { cookies } from "next/headers";

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
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ identifier, password }),
    });

    if (!response.ok) return { ok: false, error: "No pudimos completar la solicitud." };

    const result = (await response.json()) as { token: string };
    (await cookies()).set("access_token", result.token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 30,
    });
    return {
      ok: true,
      data: {
        name: identifier,
        avatarUrl: null,
      },
    };
  } catch {
    return { ok: false, error: "El servicio no está disponible en este momento." };
  }
}
