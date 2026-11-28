import { describe, expect, test } from "bun:test";
import { canCancelSubscription, canChangePlan, upgradePlans } from "./billing-plan";

const plan = (id: string, name: string, price: number, currency = "ARS") => ({ id, name, price, currency });
const plans = [plan("b", "Pro", 2000), plan("a", "Base", 1000), plan("c", "Max", 3000), plan("d", "USD", 5000, "USD"), plan("e", "Mini", 500)];

describe("upgradePlans", () => {
  test("offers only pricier plans in the current currency, cheapest first", () => {
    expect(upgradePlans(plans, "Base").map((p) => p.id)).toEqual(["b", "c"]);
  });
  test("offers nothing from the most expensive plan or an unknown one", () => {
    expect(upgradePlans(plans, "Max")).toEqual([]);
    expect(upgradePlans(plans, "Retired")).toEqual([]);
    expect(upgradePlans(plans, null)).toEqual([]);
  });
});

describe("subscription rules", () => {
  test("plan change needs an authorized, not-cancelled subscription", () => {
    expect(canChangePlan({ mercadoPagoSubscriptionStatus: "authorized", subscriptionEndsAt: null })).toBe(true);
    expect(canChangePlan({ mercadoPagoSubscriptionStatus: "pending", subscriptionEndsAt: null })).toBe(false);
    expect(canChangePlan({ mercadoPagoSubscriptionStatus: "authorized", subscriptionEndsAt: "2026-12-01T00:00:00Z" })).toBe(false);
  });
  test("cancel needs a non-terminal subscription", () => {
    expect(canCancelSubscription({ mercadoPagoSubscriptionStatus: "authorized" })).toBe(true);
    expect(canCancelSubscription({ mercadoPagoSubscriptionStatus: "paused" })).toBe(true);
    expect(canCancelSubscription({ mercadoPagoSubscriptionStatus: null })).toBe(false);
    expect(canCancelSubscription({ mercadoPagoSubscriptionStatus: "cancelled" })).toBe(false);
    expect(canCancelSubscription({ mercadoPagoSubscriptionStatus: "authorized", subscriptionEndsAt: "2026-12-01T00:00:00Z" })).toBe(false);
  });
});
