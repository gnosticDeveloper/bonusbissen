"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { request, dashboardRequest, type ActionResult } from "@/lib/api";
import { signIn as customerSignIn } from "@/app/(auth)/sign-in/actions";
import { signUp } from "@/app/(auth)/sign-up/actions";
import { signIn as dashboardSignIn } from "@/app/d/sign-in/actions";
import { userLoginSchema } from "@/schemas/user";
import { checkSession, getDashboardSessionToken } from "@/lib/auth/session";
import type { Storefront } from "@/lib/types/storefront";
import type { PointProgram } from "@/lib/types/point-program";
import { adminOrganization, cookieOptions, customerSession, loadOnboarding, PROGRESS_COOKIE, readProgress, type Organization, type OnboardingState } from "./state";

const nameSchema = z.string().trim().min(1, "Completá el nombre.").max(255, "El nombre no puede superar los 255 caracteres.");
const optionalText = z.string().trim().max(255, "Usá hasta 255 caracteres.");
const storefrontSchema = z.object({
  name: nameSchema, online: z.enum(["true", "false"]),
  address: optionalText, city: z.string().trim().max(120, "La localidad es demasiado larga."), province: z.string().trim().max(120, "La provincia es demasiado larga."),
  color: z.string().regex(/^#[0-9a-f]{6}$/i, "Elegí un color válido."),
  category: z.string().trim().max(80, "El rubro no puede superar los 80 caracteres."), hours: optionalText,
  description: z.string().trim().max(2000, "La descripción es demasiado larga."),
}).refine(v => v.online === "true" || Boolean(v.address && v.city && v.province), {
  message: "Para una sucursal física, seleccioná provincia, localidad y calle en el buscador.",
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
  if (session.status !== "valid") return { ok: false, error: "Tu sesión de cuenta venció. Volvé a ingresar antes de crear el negocio." };
  const me = await request("/users/me", { cache: "no-store" });
  if (!me.ok) return { ok: false, error: "No pudimos verificar tu cuenta. Volvé a ingresar o probá más tarde." };
  const progress = await readProgress();
  if (progress) {
    if (progress.owner !== session.payload.sub) return { ok: false, error: "Hay un negocio pendiente en este navegador. Retomalo con su cuenta administradora." };
    return refreshOnboarding();
  }
  const parsed = nameSchema.safeParse(form.get("name"));
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
  const result = await request<Organization>("/organizations", {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: parsed.data }),
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
  const organizationId = progress?.organizationId ?? String(form.get("organizationId") ?? "");
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
  if (session.status !== "valid" || session.payload.role !== "ADMIN") return { ok: false, error: "Necesitás ingresar con una cuenta administradora." };
  const org = await dashboardRequest<Organization>("/organization", { cache: "no-store" });
  if (!org.ok) return org;
  if (org.data.id !== organizationId) return { ok: false, error: "La sesión no corresponde al negocio elegido." };
  await saveProgress(org.data.id, session.payload.sub);
  return refreshOnboarding();
}

export async function createStorefront(form: FormData): Promise<Result> {
  const org = await adminOrganization();
  if (!org.ok) return org;
  const existing = await dashboardRequest<Storefront[]>("/storefronts", { cache: "no-store" });
  if (!existing.ok) return existing;
  // This journey sets up the first active branch, including after a lost POST response.
  if (existing.data.some(s => s.active)) return refreshOnboarding();
  const parsed = storefrontSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
  const { online, address, city, province, ...rest } = parsed.data;
  const result = await dashboardRequest<Storefront>("/storefronts", {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...rest, online: online === "true", ...(online === "false" ? { address, city, province } : {}) }),
  });
  if (!result.ok) return result;
  return refreshOnboarding();
}

export async function createPointProgram(form: FormData): Promise<Result> {
  const org = await adminOrganization();
  if (!org.ok) return org;
  const parsed = z.object({ name: nameSchema, unitLabel: z.string().trim().min(1, "Indicá cómo se llaman los puntos.").max(50, "El nombre de los puntos no puede superar los 50 caracteres."), storefrontId: z.uuid("Elegí una sucursal.") }).safeParse(Object.fromEntries(form));
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
  const [storefronts, programs] = await Promise.all([
    dashboardRequest<Storefront[]>("/storefronts", { cache: "no-store" }),
    dashboardRequest<PointProgram[]>("/point-programs", { cache: "no-store" }),
  ]);
  if (!storefronts.ok) return storefronts;
  if (!programs.ok) return programs;
  if (!storefronts.data.some(s => s.active && s.id === parsed.data.storefrontId)) return { ok: false, error: "La sucursal no está activa en este negocio. Actualizá el recorrido." };
  const assigned = programs.data.find(p => p.storefronts.some(s => s.id === parsed.data.storefrontId));
  if (assigned) return assigned.active ? refreshOnboarding() : { ok: false, error: "Esta sucursal tiene un programa inactivo. Reactivalo desde Mi negocio." };
  const result = await dashboardRequest<PointProgram>("/point-programs", {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name: parsed.data.name, unitLabel: parsed.data.unitLabel, storefrontIds: [parsed.data.storefrontId] }),
  });
  if (!result.ok) return result;
  return refreshOnboarding();
}

export async function finishOnboarding(): Promise<{ error: string | null }> {
  const org = await adminOrganization();
  if (!org.ok) return { error: org.error };
  const state = await loadOnboarding();
  if (!state.organization || !state.programs.some(p => p.storefronts.some(s => state.storefronts.some(sf => sf.id === s.id)))) return { error: state.error ?? "Creá una sucursal con su programa de puntos antes de terminar." };
  redirect(`/d/${org.data.id}/mi-negocio`);
}
