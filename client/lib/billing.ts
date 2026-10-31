import { z } from "zod";

export type BillingResult<T> = { ok: true; data: T } | { ok: false; error: string; status?: number };

export const billingOrganizationSchema = z.object({
  id: z.uuid(), name: z.string(), billingEmail: z.string().nullable(),
  billingPlanName: z.string().nullable(), billingCycle: z.string().nullable(),
  nextInvoiceDueAt: z.string().nullable(), mercadoPagoSubscriptionStatus: z.string().nullable(),
});
export const billingPlanSchema = z.object({ id: z.uuid(), name: z.string(), price: z.number().finite().nonnegative(), currency: z.string() });
export const billingInvoiceSchema = z.object({
  id: z.uuid(), invoiceNumber: z.number(), billingCycle: z.string(), dueAt: z.string(),
  createdAt: z.string(), amount: z.number().finite(), currency: z.string(),
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

export function subscriptionLabel(status: string | null): string {
  if (status === null) return "Sin suscripción iniciada";
  const labels = new Map([
    ["pending", "Pendiente de autorización"], ["authorized", "Cobros autorizados (no confirma un pago)"],
    ["paused", "Suscripción pausada"], ["cancelled", "Suscripción cancelada"], ["finished", "Suscripción finalizada"],
  ]);
  return labels.get(status) ?? `Estado desconocido (${status})`;
}
export function invoiceLabel(status: string): string {
  return new Map([["paid", "Pagada"], ["pending", "Pendiente de pago"], ["void", "Anulada"]]).get(status) ?? `Estado desconocido (${status})`;
}
export function billingMoney(amount: number, currency: string): string {
  try { return new Intl.NumberFormat("es-AR", { style: "currency", currency }).format(amount); }
  catch { return `${amount.toLocaleString("es-AR")} ${currency}`; }
}
export function billingDate(value: string | null): string {
  if (!value) return "Sin fecha informada";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Fecha no disponible" : date.toLocaleDateString("es-AR", { timeZone: "America/Argentina/Buenos_Aires" });
}
