"use server";

import { ActionResult } from "@/lib/api";
import { SignInUser } from "@/lib/definitions";
import { userRegisterSchema } from "@/schemas/user";
import { cookies } from "next/headers";

export async function signUp(formData: FormData): Promise<ActionResult<SignInUser>> {
  const raw = {
    name: String(formData.get("name") ?? ""),
    username: String(formData.get("username") ?? ""),
    password: String(formData.get("password") ?? ""),
    email: String(formData.get("email") ?? ""),
  };

  const parsed = userRegisterSchema.safeParse(raw);
  if (!parsed.success) {
    const firstError = parsed.error.issues[0]?.message ?? "Revisá los datos ingresados.";
    return { ok: false, error: firstError };
  }

  const { name, username, password, email } = parsed.data;

  const backendUrl = process.env.BACKEND_URL ?? "http://localhost:8080";

  try {
    const response = await fetch(`${backendUrl}/auth/user-register`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ username, name, password, email }),
    });

    if (!response.ok) return { ok: false, error: "No pudimos completar la solicitud." };

    const result = (await response.json()) as { token: string };

    (await cookies()).set("access_token", result.token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/b/",
      maxAge: 60 * 60 * 24 * 30,
    });
    return {
      ok: true,
      data: {
        name: "bro",
        avatarUrl: null,
      },
    };
  } catch {
    return { ok: false, error: "El servicio no está disponible en este momento." };
  }
}
