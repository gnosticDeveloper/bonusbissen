import "server-only";

import { cookies } from "next/headers";
import { z } from "zod";
import { dashboardRequest, request, type ActionResult } from "@/lib/api";
import { checkSession, getDashboardSessionToken, getSessionToken } from "@/lib/auth/session";
import type { Storefront } from "@/lib/types/storefront";
import type { PointProgram } from "@/lib/types/point-program";

export const PROGRESS_COOKIE = "onboarding_progress";
export const PAYMENT_COOKIE = "onboarding_payment_simulated";
export const cookieOptions = {
  httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax" as const,
  path: "/onboarding", maxAge: 60 * 60 * 24 * 7,
};
const progressSchema = z.object({ organizationId: z.uuid(), owner: z.uuid() });
export type Organization = { id: string; name: string };
export type OnboardingState = {
  customer: boolean;
  organizationId: string | null;
  organization: Organization | null;
  storefronts: Storefront[];
  programs: PointProgram[];
  error?: string;
};

export async function readProgress() {
  try {
    return progressSchema.parse(JSON.parse((await cookies()).get(PROGRESS_COOKIE)?.value ?? "null"));
  } catch { return null; }
}

export async function customerSession() {
  return checkSession(await getSessionToken());
}

// Cookies only identify the intended journey. The backend verifies every resource and permission.
export async function adminOrganization(): Promise<ActionResult<Organization>> {
  const session = await checkSession(await getDashboardSessionToken(), "dashboard");
  if (session.status !== "valid") return { ok: false, error: "Tu sesión de administración venció o no está disponible. Volvé a ingresar en Organización.", status: 401 };
  if (session.payload.role !== "ADMIN") return { ok: false, error: "Necesitás una cuenta administradora para continuar.", status: 403 };
  const organization = await dashboardRequest<Organization>("/organization", { cache: "no-store" });
  if (!organization.ok) return organization;
  const progress = await readProgress();
  if (!progress || progress.organizationId !== organization.data.id) return { ok: false, error: "Ingresá como administrador del negocio de este recorrido.", status: 401 };
  return organization;
}

export async function loadOnboarding(): Promise<OnboardingState> {
  const progress = await readProgress();
  const session = await customerSession();
  const customer = session.status === "valid" && (await request("/users/me", { cache: "no-store" })).ok;
  const state: OnboardingState = { customer, organizationId: progress?.organizationId ?? null, organization: null, storefronts: [], programs: [] };
  if (!progress) return state;
  const org = await adminOrganization();
  if (!org.ok) return { ...state, error: org.error };
  const [storefronts, programs] = await Promise.all([
    dashboardRequest<Storefront[]>("/storefronts", { cache: "no-store" }),
    dashboardRequest<PointProgram[]>("/point-programs", { cache: "no-store" }),
  ]);
  if (!storefronts.ok || !programs.ok) return { ...state, error: !storefronts.ok ? storefronts.error : !programs.ok ? programs.error : undefined };
  return { ...state, organization: org.data, storefronts: storefronts.data.filter(s => s.active), programs: programs.data.filter(p => p.active) };
}
