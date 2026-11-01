"use server";

import { checkSession, getDashboardSessionToken } from "./session";
import type { BillingResult } from "@/lib/billing";
import { UserRole } from "@/lib/definitions";

export async function billingAdminToken(): Promise<BillingResult<string>> {
  const token = await getDashboardSessionToken();
  const session = await checkSession(token, "dashboard");
  if (session.status === "unavailable") {
    return { ok: false, status: 503, error: "No pudimos verificar tu sesión. Reintentá en un momento." };
  }
  if (!token || session.status !== "valid") {
    return { ok: false, status: 401, error: "Tu sesión terminó. Volvé a ingresar a tu negocio." };
  }
  if (session.payload.role !== UserRole.ADMIN) {
    return { ok: false, status: 403, error: "Necesitás una cuenta administradora de este negocio." };
  }
  return { ok: true, data: token };
}
