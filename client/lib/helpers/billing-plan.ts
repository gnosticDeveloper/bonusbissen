import type { BillingOrganization, BillingPlan } from "@/lib/billing";

type SubscriptionState = Pick<BillingOrganization, "mercadoPagoSubscriptionStatus" | "subscriptionEndsAt">;

/**
 * Plans worth offering as an upgrade: same currency and a higher price than the current plan.
 * The organization contract only exposes the plan's name, so the current plan is matched by name;
 * if it isn't in the active list (retired plan), nothing can be compared and no upgrade is offered.
 */
export function upgradePlans(plans: BillingPlan[], currentPlanName: string | null): BillingPlan[] {
  const current = plans.find((plan) => plan.name === currentPlanName);
  if (!current) return [];
  return plans
    .filter((plan) => plan.id !== current.id && plan.currency === current.currency && plan.price > current.price)
    .sort((a, b) => a.price - b.price);
}

/**
 * A plan change only reaches Mercado Pago on a live, authorized preapproval: on a cancelled one the
 * backend would store the new plan without ever charging it.
 */
export function canChangePlan(organization: SubscriptionState): boolean {
  return organization.mercadoPagoSubscriptionStatus === "authorized" && !organization.subscriptionEndsAt;
}

/** Anything not already terminal still has a preapproval Mercado Pago could charge. */
export function canCancelSubscription(organization: SubscriptionState): boolean {
  const status = organization.mercadoPagoSubscriptionStatus;
  return status !== null && status !== "cancelled" && status !== "finished" && !organization.subscriptionEndsAt;
}
