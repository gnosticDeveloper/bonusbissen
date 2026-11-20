"use server";

import { z } from "zod";
import { billingAdminToken } from "@/lib/auth/billing-admin";
import { billingRequest } from "@/lib/billing-api";
import { billingInvoiceSchema, billingOrganizationSchema } from "@/lib/billing";

export async function getDashboardBilling() {
  const auth = await billingAdminToken();
  if (!auth.ok) return { organization: auth, invoices: auth };

  const [organization, invoices] = await Promise.all([
    billingRequest(auth.data, "/organization", billingOrganizationSchema),
    billingRequest(auth.data, "/organization/invoices", z.array(billingInvoiceSchema)),
  ]);
  return { organization, invoices };
}
