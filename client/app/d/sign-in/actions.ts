"use server";

import { ActionResult } from "@/lib/action-result";
import { PagedRequestFunction, PagedResponse } from "@/lib/definitions";
import { Organization } from "@/lib/types/organization";
import { cookies } from "next/headers";

export const publicRequest = async <T>(path: string, init?: RequestInit): Promise<ActionResult<T>> => {
  const backendUrl = process.env.BACKEND_URL ?? "http://localhost:8080";

  try {
    const response = await fetch(`${backendUrl}${path}`, {
      ...init,
      headers: {
        "Content-Type": "application/json",
        ...init?.headers,
      },
      cache: "no-store",
    });

    if (!response.ok) return { ok: false, error: "No pudimos completar la solicitud." };

    return { ok: true, data: (await response.json()) as T };
  } catch {
    return { ok: false, error: "El servicio no está disponible en este momento." };
  }
};

export const getAllOrganizations: PagedRequestFunction<Organization> = async ({ search, page, size }) => {
  const params = new URLSearchParams();
  params.append("page", page.toString());
  params.append("size", size.toString());

  if (search) params.append("search", search);

  const result = await publicRequest<PagedResponse<Organization>>(`/organizations?${params.toString()}`);

  if (!result.ok) throw new Error(result.error);

  return result.data;
};

export async function signIn(formData: FormData): Promise<ActionResult<{ name: string }>> {
  const identifier = formData.get("identifier")?.toString().trim();
  const password = formData.get("password")?.toString();
  const organizationId = formData.get("organizationId")?.toString();

  if (!identifier || !password) return { ok: false, error: "Completá usuario y contraseña." };
  if (!organizationId) return { ok: false, error: "Elegí tu negocio antes de continuar." };

  const backendUrl = process.env.BACKEND_URL ?? "http://localhost:8080";

  try {
    // TODO: change the endpoint path as prefered.
    const response = await fetch(`${backendUrl}/auth/dashboard/sign-in`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ identifier, password, organizationId }),
      cache: "no-store",
    });

    if (!response.ok) {
      if (response.status === 401) return { ok: false, error: "Usuario, contraseña o negocio incorrectos." };
      return { ok: false, error: "No pudimos completar el inicio de sesión." };
    }

    const { token } = (await response.json()) as { token: string };

    const cookieStore = await cookies();
    cookieStore.set("d_token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
    });

    return {
      ok: true,
      data: { name: identifier },
    };
  } catch {
    return { ok: false, error: "El servicio no está disponible en este momento." };
  }
}
