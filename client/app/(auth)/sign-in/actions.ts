"use server";

import { getRoleFromToken } from "@/lib/auth/session";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export interface AuthState {
  error: string | null;
}

export async function signIn(_: AuthState, formData: FormData): Promise<AuthState> {
  const user = {
    username: formData.get("username"),
    password: formData.get("password"),
  };

  if (!user.username || !user.password) return { error: "Usuario o contraseña requeridos" };

  const backendUrl = process.env.BACKEND_URL ?? "http://localhost:8080";

  const res = await fetch(`${backendUrl}/auth/login`, {
    method: "POST",
    body: JSON.stringify(user),
    headers: {
      "Content-Type": "application/json",
    },
  });

  if (!res.ok) return { error: "Credenciales incorrectas, por favor intente nuevamente." };

  const { token } = (await res.json()) as { token: string };

  const role = getRoleFromToken(token);

  // Note: this case should never happen, because it means the JWT returned by spring boot does not provide the "role" claim. But, we validate it for typescript checks.
  if (!role) return { error: "Hubo un problema al inicial sesión, intentelo nuevamente." };

  const cookieStore = await cookies();
  cookieStore.set("access_token", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
  });

  redirect("/");
}
