"use server";

import { z } from "zod";
import { billingAdminToken } from "@/lib/auth/billing-admin";
import { billingRequest } from "@/lib/billing-api";
import {
  billingInvoiceSchema,
  billingOrganizationSchema,
  billingPlanSchema,
  type BillingOrganization,
  type BillingPlan,
} from "@/lib/billing";
import { ActionResult } from "@/lib/api";
import { parseOrError } from "@/lib/action-helpers";
import { canCancelSubscription, canChangePlan, upgradePlans } from "@/lib/helpers/billing-plan";

export async function getDashboardBilling() {
  const auth = await billingAdminToken();
  if (!auth.ok) return { organization: auth, invoices: auth, plans: auth };

  const [organization, invoices, plans] = await Promise.all([
    billingRequest(auth.data, "/organization", billingOrganizationSchema),
    billingRequest(auth.data, "/organization/invoices", z.array(billingInvoiceSchema)),
    billingRequest(auth.data, "/organization/billing-plans", z.array(billingPlanSchema)),
  ]);
  return { organization, invoices, plans };
}

// Re-reads the organization so every mutation is judged on the backend's current state,
// and refuses when the session now belongs to a different organization than the screen showed.
async function context(expectedOrganizationId: string): Promise<ActionResult<{ token: string; organization: BillingOrganization }>> {
  const auth = await billingAdminToken();
  if (!auth.ok) return auth;
  const organization = await billingRequest(auth.data, "/organization", billingOrganizationSchema);
  if (!organization.ok) return organization;
  if (organization.data.id !== expectedOrganizationId)
    return { ok: false, status: 409, error: "Cambiaste de negocio. Actualizá la pantalla antes de continuar." };
  return { ok: true, data: { token: auth.data, organization: organization.data } };
}

export async function upgradeBillingPlan(organizationId: string, billingPlanId: string): Promise<ActionResult<BillingOrganization>> {
  const planId = parseOrError(z.uuid("Elegí un plan válido."), billingPlanId);
  if (!planId.ok) return planId;
  const current = await context(organizationId);
  if (!current.ok) return current;
  const { token, organization } = current.data;
  if (!canChangePlan(organization))
    return { ok: false, status: 409, error: "Solo podés cambiar de plan con los cobros autorizados y sin una cancelación en curso." };

  const plans = await billingRequest(token, "/organization/billing-plans", z.array(billingPlanSchema));
  if (!plans.ok) return plans;
  const target: BillingPlan | undefined = upgradePlans(plans.data, organization.billingPlanName).find((plan) => plan.id === planId.data);
  if (!target) return { ok: false, error: "Este plan ya no está disponible como mejora. Volvé a consultar los planes." };

  return billingRequest(token, "/organization/billing-plan", billingOrganizationSchema, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ billingPlanId: target.id }),
  });
}

export async function cancelBillingSubscription(organizationId: string): Promise<ActionResult<BillingOrganization>> {
  const current = await context(organizationId);
  if (!current.ok) return current;
  const { token, organization } = current.data;
  if (!canCancelSubscription(organization))
    return { ok: false, status: 409, error: "Tu suscripción ya está cancelada o no tiene cobros para cancelar." };

  return billingRequest(token, "/organization/billing/subscription", billingOrganizationSchema, { method: "DELETE" });
}
