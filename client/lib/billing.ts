import { z } from "zod";
// Type-only: this module is also imported by Client Components, so it must not
// pull the server-only request helpers in `@/lib/api` into their bundle.

export const billingOrganizationSchema = z.object({
  id: z.uuid(), name: z.string(), billingEmail: z.string().nullable(),
  billingPlanName: z.string().nullable(), billingCycle: z.string().nullable(),
  nextInvoiceDueAt: z.string().nullable(), mercadoPagoSubscriptionStatus: z.string().nullable(),
});
export const billingPlanSchema = z.object({ id: z.uuid(), name: z.string(), price: z.number().nonnegative(), currency: z.string() });
export const billingInvoiceSchema = z.object({
  id: z.uuid(), invoiceNumber: z.number(), billingCycle: z.string(), dueAt: z.string(),
  createdAt: z.string(), amount: z.number(), currency: z.string(),
  paymentStatus: z.string(), overdue: z.boolean(), paidAt: z.string().nullable(),
  paymentReference: z.string().nullable(),
});
export const billingCheckoutSchema = z.object({ initPoint: z.string(), status: z.string() });
export type BillingOrganization = z.infer<typeof billingOrganizationSchema>;
export type BillingPlan = z.infer<typeof billingPlanSchema>;
export type BillingInvoice = z.infer<typeof billingInvoiceSchema>;
export type BillingData = { organization: BillingOrganization };
export type BillingPlansData = BillingData & { plans: BillingPlan[] };

// Exact hosts only: suffix matching would also accept attacker-owned domains.
export function safeCheckoutUrl(value: string): string | null {
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" || url.username || url.password || url.port ||
      !["www.mercadopago.com.ar", "mercadopago.com.ar", "www.mercadopago.com", "mercadopago.com"].includes(url.hostname)) return null;
    return url.href;
  } catch { return null; }
}
