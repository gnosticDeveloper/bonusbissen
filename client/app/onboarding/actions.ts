"use server";

import { cookies } from "next/headers";
import { logoutFromBackend } from "@/lib/auth/logout";
import { clearAllSessions, deleteSessionCookies, sessionCookies, SESSION_AREAS } from "@/lib/auth/refresh";

import { z } from "zod";
import { request, dashboardRequest, type ActionResult } from "@/lib/api";
import { signIn as customerSignIn } from "@/app/(auth)/sign-in/actions";
import { signUp } from "@/app/(auth)/sign-up/actions";
import { signIn as dashboardSignIn } from "@/app/d/sign-in/actions";
import { userLoginSchema } from "@/schemas/user";
import { isBillingAuthorized, parseOrError } from "@/lib/action-helpers";
import { currentSession } from "@/lib/auth/session";
import type { Storefront } from "@/lib/types/storefront";
import type { PointProgram } from "@/lib/types/point-program";
import { ensureOnboardingStorefront } from "./storefront-session";
import { exchangeDashboardSession } from "./dashboard-session";
import {
  adminOrganization,
  cookieOptions,
  customerSession,
  deadSession,
  loadOnboarding,
  PROGRESS_COOKIE,
  readProgress,
  SESSION_RESET_ERROR,
  sessionTokens,
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

/**
 * Deletes the cookies of a session that stopped verifying and reloads the
 * journey, which then starts at the first step. The areas are re-derived from
 * the cookies here: the client never says which session to drop. A session that
 * only failed verification because the key was unavailable is left untouched, and
 * the areas that still verify keep their cookies.
 */
export async function resetOnboardingSession(): Promise<Result> {
  const jar = await cookies();
  const tokens = await sessionTokens();
  const areas = SESSION_AREAS.filter(area => deadSession(tokens[area]));
  // Revoke the backend session too, so a refresh token for a session we are
  // deleting from the browser cannot keep issuing access tokens.
  await Promise.all(areas.map(area => logoutFromBackend(tokens[area].token, jar.get(sessionCookies[area].refresh)?.value)));
  for (const area of areas) deleteSessionCookies(jar, area);
  const data = await loadOnboarding();
  return { ok: true, data: { ...data, error: data.error ?? (areas.length ? SESSION_RESET_ERROR : undefined) } };
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
  if (progress?.owner === session.payload.sub) {
    // The business already exists for this account, so upgrade the session
    // instead of asking for the password again. A failed exchange falls
    // through to the admin login form, exactly as before.
    await exchangeDashboardSession(progress.organizationId);
    return refreshOnboarding();
  }
  // A different account's hint cannot block this user or choose their business.
  // Replace it only after the backend confirms creation for the verified user.
  const parsed = parseOrError(nameSchema, form.get("name"));
  if (!parsed.ok) return parsed;
  const result = await request<Organization>("/organizations", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name: parsed.data }),
  });
  if (!result.ok) return result;
  await saveProgress(result.data.id, session.payload.sub);
  // The creator is already an active ADMIN of this business, so trade the
  // customer session for a dashboard one rather than prompting again.
  await exchangeDashboardSession(result.data.id);
  return refreshOnboarding();
}

async function saveProgress(organizationId: string, owner: string) {
  (await cookies()).set(PROGRESS_COOKIE, JSON.stringify({ organizationId, owner }), cookieOptions);
}

async function clearProgress() {
  (await cookies()).set(PROGRESS_COOKIE, "", { ...cookieOptions, maxAge: 0 });
}

export async function authenticateAdmin(form: FormData): Promise<Result> {
  const progress = await readProgress();
  const customer = await customerSession();
  const previousAdmin = await currentSession("dashboard");
  const owner = customer.status === "valid" ? customer.payload.sub : previousAdmin.status === "valid" ? previousAdmin.payload.sub : null;
  const organizationId = (owner && progress?.owner === owner ? progress.organizationId : null) ?? String(form.get("organizationId") ?? "");
  const credentials = parseOrError(userLoginSchema, Object.fromEntries(form));
  if (!credentials.ok) return credentials;
  if (!z.uuid().safeParse(organizationId).success) return { ok: false, error: "Elegí el negocio que querés retomar." };
  const login = new FormData();
  login.set("identifier", credentials.data.identifier);
  login.set("password", credentials.data.password);
  login.set("organizationId", organizationId);
  const result = await dashboardSignIn(login);
  if (!result.ok) return result;
  const session = await currentSession("dashboard");
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
  if (!isBillingAuthorized(org.data))
    return { ok: false, error: "Autorizá los cobros en Mercado Pago antes de configurar la sucursal." };
  const existing = await dashboardRequest<Storefront[]>("/storefronts", { cache: "no-store" });
  if (!existing.ok) return existing;
  // This journey sets up the first active branch, including after a lost POST response.
  const active = existing.data.find((s) => s.active);
  if (active) {
    const ready = await ensureOnboardingStorefront(active.id);
    return ready.ok ? refreshOnboarding() : ready;
  }
  const parsed = parseOrError(storefrontSchema, Object.fromEntries(form));
  if (!parsed.ok) return parsed;

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
  if (!isBillingAuthorized(org.data))
    return { ok: false, error: "Autorizá los cobros en Mercado Pago antes de configurar el programa." };
  const parsed = parseOrError(
    z.object({
      name: nameSchema,
      unitLabel: z.string().trim().min(1, "Indicá cómo se llaman los puntos.").max(50, "El nombre de los puntos no puede superar los 50 caracteres."),
      storefrontId: z.uuid("Elegí una sucursal."),
    }),
    Object.fromEntries(form),
  );
  if (!parsed.ok) return parsed;
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
/** Sin UI todavía; cubierto por tests. */
export async function leaveOnboarding(): Promise<void> {
  await clearAllSessions();
  await clearProgress();
}

export async function finishOnboarding(): Promise<ActionResult<{ userId: string; destination: string }>> {
  const org = await adminOrganization();
  if (!org.ok) return org;
  const state = await loadOnboarding();
  if (state.error) return { ok: false, error: state.error };
  if (!org.data.billingPlanName || !state.organization?.billingPlanName)
    return { ok: false, error: "Elegí un plan antes de finalizar la configuración." };
  if (!isBillingAuthorized(org.data) || !isBillingAuthorized(state.organization))
    return { ok: false, error: "Autorizá los cobros en Mercado Pago antes de finalizar la configuración." };
  const storefront = state.storefronts.find((sf) => state.programs.some((p) => p.storefronts.some((s) => s.id === sf.id)));
  if (!state.userId || state.organization?.id !== org.data.id || !storefront)
    return { ok: false, error: "Creá una sucursal con su programa de puntos antes de terminar." };
  const ready = await ensureOnboardingStorefront(storefront.id);
  if (!ready.ok) return ready;
  const session = await currentSession("dashboard");
  if (session.status !== "valid" || session.payload.sub !== state.userId ||
    session.payload.role !== "ADMIN" || session.payload.sf !== storefront.id)
    return { ok: false, error: "No pudimos confirmar la sucursal de tu sesión. Probá de nuevo." };
  await clearProgress();
  return { ok: true, data: { userId: state.userId, destination: `/d/${org.data.id}/mi-negocio` } };
}
