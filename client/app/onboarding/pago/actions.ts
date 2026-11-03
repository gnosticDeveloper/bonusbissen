"use server";

import { z } from "zod";
import { billingAdminToken } from "@/lib/auth/billing-admin";
import { billingRequest } from "@/lib/billing-api";
import {
  billingCheckoutSchema,
  billingOrganizationSchema,
  billingPlanSchema,
  safeCheckoutUrl,
  type BillingData,
  type BillingOrganization,
  type BillingPlansData,
  type BillingResult,
} from "@/lib/billing";

async function context(expectedOrganizationId?: string): Promise<BillingResult<{ token: string; organization: BillingOrganization }>> {
  const auth = await billingAdminToken();
  if (!auth.ok) return auth;
  const organization = await billingRequest(auth.data, "/organization", billingOrganizationSchema);
  if (!organization.ok) return organization;
  if (expectedOrganizationId !== undefined && organization.data.id !== expectedOrganizationId)
    return { ok: false, status: 409, error: "Cambiaste de negocio. Actualizá la pantalla antes de continuar." };
  return { ok: true, data: { token: auth.data, organization: organization.data } };
}

export async function loadBilling(expectedOrganizationId?: string): Promise<BillingResult<BillingData>> {
  const current = await context(expectedOrganizationId);
  if (!current.ok) return current;
  return { ok: true, data: { organization: current.data.organization } };
}

export async function getBillingPlans(expectedOrganizationId?: string): Promise<BillingResult<BillingPlansData>> {
  const current = await context(expectedOrganizationId);
  if (!current.ok) return current;
  const { token, organization } = current.data;
  const plans = await billingRequest(token, "/organization/billing-plans", z.array(billingPlanSchema));
  if (!plans.ok) return plans;
  return { ok: true, data: { organization, plans: plans.data } };
}

export async function selectBillingPlan(organizationId: string, billingPlanId: string): Promise<BillingResult<BillingOrganization>> {
  if (!z.uuid().safeParse(billingPlanId).success) return { ok: false, error: "Elegí un plan válido." };
  const current = await context(organizationId);
  if (!current.ok) return current;
  if (current.data.organization.mercadoPagoSubscriptionStatus === "authorized")
    return { ok: false, error: "Tu plan ya está confirmado. Continuá con la configuración del negocio." };
  const plans = await billingRequest(current.data.token, "/organization/billing-plans", z.array(billingPlanSchema));
  if (!plans.ok) return plans;
  if (!plans.data.some(plan => plan.id === billingPlanId))
    return { ok: false, error: "Este plan ya no está disponible. Volvé a consultar los planes." };
  return billingRequest(current.data.token, "/organization/billing-plan", billingOrganizationSchema, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ billingPlanId }),
  });
}

export async function startCheckout(organizationId: string, payerEmail: string): Promise<BillingResult<{ initPoint: string; status: string }>> {
  const email = z.email().safeParse(typeof payerEmail === "string" ? payerEmail.trim() : payerEmail);
  if (!email.success) return { ok: false, error: "Ingresá un correo válido para pagar con Mercado Pago." };
  const current = await context(organizationId);
  if (!current.ok) return current;
  const { organization, token } = current.data;
  if (!organization.billingPlanName) return { ok: false, error: "Guardá un plan antes de ir a Mercado Pago." };
  if (organization.mercadoPagoSubscriptionStatus === "authorized")
    return { ok: false, status: 409, error: "Ya autorizaste los cobros. Podés continuar con la configuración." };
  const result = await billingRequest(token, "/organization/billing/checkout", billingCheckoutSchema, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ payerEmail: email.data }),
  });
  if (!result.ok) return result;
  const initPoint = safeCheckoutUrl(result.data.initPoint);
  if (!initPoint)
    return {
      ok: false,
      error:
        "No pudimos verificar el enlace de Mercado Pago. Reintentá la consulta antes de volver a preparar el pago.",
    };
  return { ok: true, data: { initPoint, status: result.data.status } };
}

export async function cancelBillingSubscription(organizationId: string): Promise<BillingResult<BillingOrganization>> {
  const current = await context(organizationId);
  if (!current.ok) return current;
  return billingRequest(current.data.token, "/organization/billing/subscription", billingOrganizationSchema, { method: "DELETE" });
}
