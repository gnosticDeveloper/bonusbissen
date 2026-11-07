"use server";

import { z } from "zod";
import { ActionResult, backendFetchWithResponse, dashboardRequest, publicRequest } from "@/lib/api";
import { sessionTokenSchema } from "@/schemas/user";
import { PagedRequestFunction, PagedResponse } from "@/lib/definitions";
import { cookies } from "next/headers";
import { checkSession, currentSession } from "@/lib/auth/session";
import {
  accessCookieOptions,
  DASHBOARD_ACCESS_COOKIE,
  DASHBOARD_REFRESH_COOKIE,
  DASHBOARD_STOREFRONTS_COOKIE,
  saveDashboardSession,
} from "@/lib/auth/refresh";

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

const dashboardSignInSchema = sessionTokenSchema.extend({
  storefronts: z.array(z.object({ id: z.string(), name: z.string() })),
});

export async function getDashboardStorefronts(): Promise<StorefrontSummary[]> {
  const value = (await cookies()).get(DASHBOARD_STOREFRONTS_COOKIE)?.value;
  if (!value) return [];
  try {
    const storefronts: unknown = JSON.parse(value);
    return Array.isArray(storefronts) && storefronts.every(
      (item) => item && typeof item.id === "string" && typeof item.name === "string",
    ) ? storefronts : [];
  } catch {
    return [];
  }
}

function saveStorefronts(cookieStore: Awaited<ReturnType<typeof cookies>>, storefronts: StorefrontSummary[]) {
  cookieStore.set(DASHBOARD_STOREFRONTS_COOKIE, JSON.stringify(storefronts), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
  });
}

export async function signIn(formData: FormData): Promise<ActionResult<{ storefronts: StorefrontSummary[] }>> {
  const identifier = formData.get("identifier")?.toString().trim();
  const password = formData.get("password")?.toString();
  const organizationId = formData.get("organizationId")?.toString();

  if (!identifier || !password) return { ok: false, error: "Completá usuario y contraseña." };
  if (!organizationId) return { ok: false, error: "Elegí tu negocio antes de continuar." };

  const result = await backendFetchWithResponse(
    "/auth/dashboard/sign-in",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ identifier, password, organizationId }),
      cache: "no-store",
    },
    {
      schema: dashboardSignInSchema,
      messages: {
        byStatus: { 401: "Usuario, contraseña o negocio incorrectos." },
        failed: "No pudimos completar el inicio de sesión.",
      },
    },
  );
  if (!result.ok) return result;

  const { token, storefronts } = result.data;
  if (!(await saveDashboardSession(result.response, token))) {
    return { ok: false, error: "No pudimos iniciar sesión. Probá de nuevo." };
  }
  saveStorefronts(await cookies(), storefronts);

  return { ok: true, data: { storefronts } };
}

export async function selectStorefront(storefrontId: string): Promise<{ success: true } | { success: false; error: string }> {
  const session = await currentSession("dashboard");
  if (session.status !== "valid") return { success: false, error: "Tu sesión terminó o no pudimos comprobar tu ingreso. Volvé a ingresar." };
  const cookieStore = await cookies();
  const refresh = cookieStore.get(DASHBOARD_REFRESH_COOKIE)?.value;
  const res = await dashboardRequest<{ token: string; storefronts: StorefrontSummary[] }>("/auth/storefront", {
    method: "POST",
    body: JSON.stringify({ storefrontId }),
    headers: {
      "Content-Type": "application/json",
      ...(refresh ? { Cookie: `bb_rt=${refresh}` } : {}),
    },
    cache: "no-store",
  });
  if (!res.ok) return { success: false, error: "No pudimos seleccionar el local." };

  const selected = await checkSession(res.data.token, "dashboard");
  if (selected.status !== "valid" || selected.payload.sub !== session.payload.sub ||
    selected.payload.role !== session.payload.role || selected.payload.sf !== storefrontId)
    return { success: false, error: "No pudimos confirmar la sucursal de tu sesión. Probá de nuevo." };

  cookieStore.set(DASHBOARD_ACCESS_COOKIE, res.data.token, accessCookieOptions);
  saveStorefronts(cookieStore, res.data.storefronts);
  return { success: true };
}
