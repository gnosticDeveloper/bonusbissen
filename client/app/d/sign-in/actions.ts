"use server";

import { ActionResult } from "@/lib/action-result";
import { dashboardRequest } from "@/lib/api";
import { PagedRequestFunction, PagedResponse } from "@/lib/definitions";
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

export type OrganizationOption = { id: string; name: string };

export const getAllOrganizations: PagedRequestFunction<OrganizationOption> = async ({ search, page, size }) => {
  const params = new URLSearchParams();
  params.append("page", page.toString());
  params.append("size", size.toString());

  if (search) params.append("search", search);

  const result = await publicRequest<PagedResponse<{ id: string; name: string }>>(`/organizations?${params.toString()}`);

  if (!result.ok) throw new Error(result.error);

  return result.data;
};

export type StorefrontSummary = {
  id: string;
  name: string;
};

export async function signIn(formData: FormData): Promise<ActionResult<{ storefronts: StorefrontSummary[] }>> {
  const identifier = formData.get("identifier")?.toString().trim();
  const password = formData.get("password")?.toString();
  const organizationId = formData.get("organizationId")?.toString();

  if (!identifier || !password) return { ok: false, error: "Completá usuario y contraseña." };
  if (!organizationId) return { ok: false, error: "Elegí tu negocio antes de continuar." };

  const backendUrl = process.env.BACKEND_URL ?? "http://localhost:8080";

  try {
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

    const { token, storefronts } = (await response.json()) as { token: string; storefronts: StorefrontSummary[] };

    const cookieStore = await cookies();
    cookieStore.set("d_token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
    });

    return {
      ok: true,
      data: { storefronts },
    };
  } catch {
    return { ok: false, error: "El servicio no está disponible en este momento." };
  }
}

export async function selectStorefront(storefrontId: string) {
  const res = await dashboardRequest<{ token: string }>("/auth/storefront", {
    method: "POST",
    body: JSON.stringify({ storefrontId }),
    headers: { "Content-Type": "application/json" },
  });
  if (!res.ok) return { success: false, error: "No pudimos seleccionar el local." };

  const cookieStore = await cookies();
  cookieStore.set("d_token", res.data.token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
  });
  return { success: true };
}
