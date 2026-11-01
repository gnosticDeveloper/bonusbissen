import "server-only";

import { cookies } from "next/headers";
import { z } from "zod";
import { dashboardRequest, request, type ActionResult } from "@/lib/api";
import { checkSession, getDashboardSessionToken, getSessionToken } from "@/lib/auth/session";
import type { Storefront } from "@/lib/types/storefront";
import type { PointProgram } from "@/lib/types/point-program";

export const PROGRESS_COOKIE = "onboarding_progress";

export const cookieOptions = {
  httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax" as const,
  path: "/onboarding", maxAge: 60 * 60 * 24 * 7,
};
const progressSchema = z.object({ organizationId: z.uuid(), owner: z.uuid() });
export type Organization = { id: string; name: string; billingPlanName?: string | null; mercadoPagoSubscriptionStatus?: string | null };
export type OnboardingState = {
  userId: string | null;
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
  if (session.status !== "valid") return { ok: false, error: "Tu sesión terminó. Volvé a ingresar a tu negocio.", status: 401 };
  if (session.payload.role !== "ADMIN") return { ok: false, error: "Ingresá con la cuenta que administra el negocio.", status: 403 };
  const organization = await dashboardRequest<Organization>("/organization", { cache: "no-store" });
  if (!organization.ok) return organization;
  const progress = await readProgress();
  const customer = await customerSession();
  if (customer.status === "valid" && customer.payload.sub !== session.payload.sub) return { ok: false, error: "Hay dos cuentas abiertas. Volvé a ingresar con la cuenta de este negocio.", status: 401 };
  if (progress && (progress.owner !== session.payload.sub || progress.organizationId !== organization.data.id)) return { ok: false, error: "Ingresá como administrador del negocio de este recorrido.", status: 401 };
  return organization;
}

export async function loadOnboarding(): Promise<OnboardingState> {
  const progress = await readProgress();
  const session = await customerSession();
  const me = session.status === "valid" ? await request<{ id: string }>("/users/me", { cache: "no-store" }) : null;
  const customer = session.status === "valid" && me?.ok === true && me.data.id === session.payload.sub;
  const admin = await checkSession(await getDashboardSessionToken(), "dashboard");
  const userId = customer && session.status === "valid" ? session.payload.sub : null;
  const state: OnboardingState = { userId, customer, organizationId: userId && progress?.owner === userId ? progress.organizationId : null, organization: null, storefronts: [], programs: [] };
  // A rejected customer session must not silently switch to another dashboard identity.
  if (session.status === "valid" && !customer) return { ...state, error: "No pudimos verificar tu cuenta. Volvé a ingresar." };
  // No dashboard session is normal before the first administrator login, even
  // after creating an organization. A progress hint alone does not imply expiry.
  if (admin.status !== "valid") {
    if (admin.status === "expired") return { ...state, error: "Tu sesión terminó. Volvé a ingresar a tu negocio." };
    if (admin.status === "unavailable") return { ...state, error: "No pudimos comprobar tu ingreso. Probá de nuevo." };
    if (session.status === "expired") return { ...state, error: "Tu sesión de cuenta venció. Volvé a ingresar." };
    if (session.status === "unavailable") return { ...state, error: "No pudimos verificar tu sesión. Probá de nuevo." };
    return state;
  }
  const org = await adminOrganization();
  if (!org.ok) return { ...state, error: org.error };
  state.userId = admin.payload.sub;
  state.organizationId = org.data.id;
  const [storefronts, programs] = await Promise.all([
    dashboardRequest<Storefront[]>("/storefronts", { cache: "no-store" }),
    dashboardRequest<PointProgram[]>("/point-programs", { cache: "no-store" }),
  ]);
  if (!storefronts.ok || !programs.ok) return { ...state, error: !storefronts.ok ? storefronts.error : !programs.ok ? programs.error : undefined };
  return { ...state, organization: org.data, storefronts: storefronts.data.filter(s => s.active), programs: programs.data.filter(p => p.active) };
}
