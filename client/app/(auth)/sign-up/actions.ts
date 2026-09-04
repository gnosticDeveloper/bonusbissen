"use server";

import { cookies } from "next/headers";
import { AuthState } from "../sign-in/actions";
import { redirect } from "next/navigation";

export async function signUp(_: AuthState, formData: FormData): Promise<AuthState> {
  const user = {
    username: formData.get("username"),
    accountName: formData.get("account_name"),
    password: formData.get("password"),
  };

  if (!user.username || !user.password || !user.accountName) return { error: "Por favor ingrese los datos requeridos en todos los campos." };

  const backendUrl = process.env.BACKEND_URL ?? "http://localhost:8080";

  const res = await fetch(`${backendUrl}/auth/register`, {
    method: "POST",
    body: JSON.stringify(user),
    headers: {
      "Content-Type": "application/json",
    },
  });

  if (!res.ok) return { error: "Hubo un problema al registrarse." };

  const { token } = (await res.json()) as { token: string };

  const cookieStore = await cookies();
  cookieStore.set("access_token", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
  });

  // Note: unlike in signIn where we redirect based on the user's role, here we will always assume only customers are creating an account on the system,
  // since the employees/admin accounts are created only by us.
  redirect("/");
}
