"use server";

import { cookies } from "next/headers";
import { logoutFromBackend } from "@/lib/auth/logout";
import { CUSTOMER_ACCESS_COOKIE, CUSTOMER_REFRESH_COOKIE, DASHBOARD_ACCESS_COOKIE, DASHBOARD_REFRESH_COOKIE, DASHBOARD_STOREFRONTS_COOKIE } from "@/lib/auth/refresh";

import { z } from "zod";
import { request, dashboardRequest, type ActionResult } from "@/lib/api";
import { signIn as customerSignIn } from "@/app/(auth)/sign-in/actions";
import { signUp } from "@/app/(auth)/sign-up/actions";
import { signIn as dashboardSignIn } from "@/app/d/sign-in/actions";
import { userLoginSchema } from "@/schemas/user";
import { checkSession, getDashboardSessionToken } from "@/lib/auth/session";
import type { Storefront } from "@/lib/types/storefront";
import type { PointProgram } from "@/lib/types/point-program";
import { ensureOnboardingStorefront } from "./storefront-session";
import {
  adminOrganization,
  cookieOptions,
  customerSession,
  loadOnboarding,
  PROGRESS_COOKIE,
  readProgress,
  type Organization,
  type OnboardingState,
} from "./state";

const nameSchema = z.string().trim().min(1, "Completá el nombre.").max(255, "El nombre no puede superar los 255 caracteres.");
const optionalText = z.string().trim().max(255, "Usá hasta 255 caracteres.");
const storefrontSchema = z
  .object({
    name: nameSchema,
    address: optionalText.min(1, "Completá la dirección de la sucursal."),
    city: z.string().trim().min(1, "Completá la localidad.").max(120, "La localidad es demasiado larga."),
    province: z.string().trim().min(1, "Completá la provincia.").max(120, "La provincia es demasiado larga."),
    color: z.string().regex(/^#[0-9a-f]{6}$/i, "Elegí un color válido."),
    category: z.string().trim().max(80, "El rubro no puede superar los 80 caracteres."),
    hours: optionalText,
    description: z.string().trim().max(2000, "La descripción es demasiado larga."),
  });

type Result = ActionResult<OnboardingState>;
export async function refreshOnboarding(): Promise<Result> {
  return { ok: true, data: await loadOnboarding() };
}

export async function authenticateCustomer(mode: "sign-in" | "sign-up", form: FormData): Promise<Result> {
  if (mode !== "sign-in" && mode !== "sign-up") return { ok: false, error: "Elegí cómo ingresar." };
  const result = await (mode === "sign-up" ? signUp(form) : customerSignIn(form));
  if (!result.ok) return result;
  return refreshOnboarding();
}

export async function createOrganization(form: FormData): Promise<Result> {
  const session = await customerSession();
  if (session.status !== "valid") return { ok: false, error: "Tu sesión terminó. Volvé a ingresar antes de crear el negocio." };
  const me = await request<{ id: string }>("/users/me", { cache: "no-store" });
  if (!me.ok || me.data.id !== session.payload.sub)
    return { ok: false, error: "No pudimos verificar tu cuenta. Volvé a ingresar o probá más tarde." };
  const progress = await readProgress();
  if (progress?.owner === session.payload.sub) return refreshOnboarding();
  // A different account's hint cannot block this user or choose their business.
  // Replace it only after the backend confirms creation for the verified user.
  const parsed = nameSchema.safeParse(form.get("name"));
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
  const result = await request<Organization>("/organizations", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name: parsed.data }),
  });
  if (!result.ok) return result;
  await saveProgress(result.data.id, session.payload.sub);
  return refreshOnboarding();
}

async function saveProgress(organizationId: string, owner: string) {
  (await cookies()).set(PROGRESS_COOKIE, JSON.stringify({ organizationId, owner }), cookieOptions);
}

export async function authenticateAdmin(form: FormData): Promise<Result> {
  const progress = await readProgress();
  const customer = await customerSession();
  const previousAdmin = await checkSession(await getDashboardSessionToken(), "dashboard");
  const owner = customer.status === "valid" ? customer.payload.sub : previousAdmin.status === "valid" ? previousAdmin.payload.sub : null;
  const organizationId = (owner && progress?.owner === owner ? progress.organizationId : null) ?? String(form.get("organizationId") ?? "");
  const credentials = userLoginSchema.safeParse(Object.fromEntries(form));
  if (!credentials.success) return { ok: false, error: credentials.error.issues[0].message };
  if (!z.uuid().safeParse(organizationId).success) return { ok: false, error: "Elegí el negocio que querés retomar." };
  const login = new FormData();
  login.set("identifier", credentials.data.identifier);
  login.set("password", credentials.data.password);
  login.set("organizationId", organizationId);
  const result = await dashboardSignIn(login);
  if (!result.ok) return result;
  const session = await checkSession(await getDashboardSessionToken(), "dashboard");
  if (session.status !== "valid" || session.payload.role !== "ADMIN")
    return { ok: false, error: "Ingresá con la cuenta que administra el negocio." };
  if (customer.status === "valid" && customer.payload.sub !== session.payload.sub)
    return { ok: false, error: "Usá la misma cuenta con la que empezaste." };
  const org = await dashboardRequest<Organization>("/organization", { cache: "no-store" });
  if (!org.ok) return org;
  if (org.data.id !== organizationId) return { ok: false, error: "La sesión no corresponde al negocio elegido." };
  await saveProgress(org.data.id, session.payload.sub);
  return refreshOnboarding();
}

export async function createStorefront(form: FormData): Promise<Result> {
  const org = await adminOrganization();
  if (!org.ok) return org;
  if (!org.data.billingPlanName) return { ok: false, error: "Elegí un plan antes de configurar la sucursal." };
  if (org.data.mercadoPagoSubscriptionStatus !== "authorized")
    return { ok: false, error: "Autorizá los cobros en Mercado Pago antes de configurar la sucursal." };
  const existing = await dashboardRequest<Storefront[]>("/storefronts", { cache: "no-store" });
  if (!existing.ok) return existing;
  // This journey sets up the first active branch, including after a lost POST response.
  const active = existing.data.find((s) => s.active);
  if (active) {
    const ready = await ensureOnboardingStorefront(active.id);
    return ready.ok ? refreshOnboarding() : ready;
  }
  const parsed = storefrontSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };

  const result = await dashboardRequest<Storefront>("/storefronts", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...parsed.data, online: false }),
  });
  if (!result.ok) return result;
  const ready = await ensureOnboardingStorefront(result.data.id);
  return ready.ok ? refreshOnboarding() : ready;
}

export async function createPointProgram(form: FormData): Promise<Result> {
  const org = await adminOrganization();
  if (!org.ok) return org;
  if (!org.data.billingPlanName) return { ok: false, error: "Elegí un plan antes de configurar el programa." };
  if (org.data.mercadoPagoSubscriptionStatus !== "authorized")
    return { ok: false, error: "Autorizá los cobros en Mercado Pago antes de configurar el programa." };
  const parsed = z
    .object({
      name: nameSchema,
      unitLabel: z.string().trim().min(1, "Indicá cómo se llaman los puntos.").max(50, "El nombre de los puntos no puede superar los 50 caracteres."),
      storefrontId: z.uuid("Elegí una sucursal."),
    })
    .safeParse(Object.fromEntries(form));
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
  const [storefronts, programs] = await Promise.all([
    dashboardRequest<Storefront[]>("/storefronts", { cache: "no-store" }),
    dashboardRequest<PointProgram[]>("/point-programs", { cache: "no-store" }),
  ]);
  if (!storefronts.ok) return storefronts;
  if (!programs.ok) return programs;
  if (!storefronts.data.some((s) => s.active && s.id === parsed.data.storefrontId))
    return { ok: false, error: "La sucursal no está activa en este negocio. Volvé a cargar la página." };
  const assigned = programs.data.find((p) => p.storefronts.some((s) => s.id === parsed.data.storefrontId));
  if (assigned)
    return assigned.active ? refreshOnboarding() : { ok: false, error: "Esta sucursal tiene un programa inactivo. Reactivalo desde Mi negocio." };
  const result = await dashboardRequest<PointProgram>("/point-programs", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name: parsed.data.name, unitLabel: parsed.data.unitLabel, storefrontIds: [parsed.data.storefrontId] }),
  });
  if (!result.ok) return result;
  return refreshOnboarding();
}

export async function leaveOnboarding(): Promise<void> {
  const jar = await cookies();
  await Promise.all([
    logoutFromBackend(jar.get(CUSTOMER_ACCESS_COOKIE)?.value, jar.get(CUSTOMER_REFRESH_COOKIE)?.value),
    logoutFromBackend(jar.get(DASHBOARD_ACCESS_COOKIE)?.value, jar.get(DASHBOARD_REFRESH_COOKIE)?.value),
  ]);
  for (const name of [CUSTOMER_ACCESS_COOKIE, CUSTOMER_REFRESH_COOKIE, DASHBOARD_ACCESS_COOKIE, DASHBOARD_REFRESH_COOKIE, DASHBOARD_STOREFRONTS_COOKIE]) jar.delete(name);
  jar.set(PROGRESS_COOKIE, "", { ...cookieOptions, maxAge: 0 });
}

export type FinishResult = { error: string } | { error: null; userId: string; destination: string };

export async function finishOnboarding(): Promise<FinishResult> {
  const org = await adminOrganization();
  if (!org.ok) return { error: org.error };
  const state = await loadOnboarding();
  if (state.error) return { error: state.error };
  if (!org.data.billingPlanName || !state.organization?.billingPlanName)
    return { error: "Elegí un plan antes de finalizar la configuración." };
  if (org.data.mercadoPagoSubscriptionStatus !== "authorized" || state.organization?.mercadoPagoSubscriptionStatus !== "authorized")
    return { error: "Autorizá los cobros en Mercado Pago antes de finalizar la configuración." };
  const storefront = state.storefronts.find((sf) => state.programs.some((p) => p.storefronts.some((s) => s.id === sf.id)));
  if (!state.userId || state.organization?.id !== org.data.id || !storefront)
    return { error: "Creá una sucursal con su programa de puntos antes de terminar." };
  const ready = await ensureOnboardingStorefront(storefront.id);
  if (!ready.ok) return { error: ready.error };
  const session = await checkSession(await getDashboardSessionToken(), "dashboard");
  if (session.status !== "valid" || session.payload.sub !== state.userId ||
    session.payload.role !== "ADMIN" || session.payload.sf !== storefront.id)
    return { error: "No pudimos confirmar la sucursal de tu sesión. Probá de nuevo." };
  (await cookies()).set(PROGRESS_COOKIE, "", { ...cookieOptions, maxAge: 0 });
  return { error: null, userId: state.userId, destination: `/d/${org.data.id}/mi-negocio` };
}
