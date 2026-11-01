import { afterEach, beforeEach, describe, expect, mock, test } from "bun:test";
import { z } from "zod";
import { billingOrganizationSchema, invoiceLabel, safeCheckoutUrl, subscriptionLabel } from "../../../lib/billing";

mock.module("server-only", () => ({}));
let session;
let token;
let refreshResult;
const jar = new Map();
mock.module("next/headers", () => ({ cookies: async () => ({
  get: key => jar.has(key) ? { value: jar.get(key) } : undefined,
  set: (key, value) => jar.set(key, value), delete: key => jar.delete(key),
}) }));
mock.module("@/lib/auth/session", () => ({
  getDashboardSessionToken: async () => token,
  checkSession: async () => session,
}));
mock.module("@/lib/auth/refresh", () => ({
  DASHBOARD_ACCESS_COOKIE: "d_token", DASHBOARD_REFRESH_COOKIE: "bb_dashboard_rt", DASHBOARD_STOREFRONTS_COOKIE: "d_storefronts",
  accessCookieOptions: {}, refreshCookieOptions: () => ({}), refreshSession: async () => refreshResult,
}));
mock.module("@/lib/auth/logout", () => ({ logoutFromBackend: async () => {} }));
const { billingRequest } = await import("../../../lib/billing-api");
const { getBillingPlans, loadBilling, startCheckout, selectBillingPlan, cancelBillingSubscription, leaveBilling } = await import("./actions");
const originalFetch = globalThis.fetch;
const org = { id: "11111111-1111-4111-8111-111111111111", name: "Mi negocio", billingEmail: null,
  billingPlanName: "Inicial", billingCycle: "monthly", nextInvoiceDueAt: null, mercadoPagoSubscriptionStatus: "pending" };
const planId = "22222222-2222-4222-8222-222222222222";
let calls;
let respond;
beforeEach(() => {
  session = { status: "valid", payload: { role: "ADMIN" } }; token = "verified-token";
  refreshResult = { status: "expired" }; jar.clear(); calls = [];
  respond = path => path === "/organization" ? Response.json(org) : Response.json([]);
  globalThis.fetch = async (url, init) => { const path = new URL(url).pathname; calls.push({ path, ...init }); return respond(path, init); };
});
afterEach(() => { globalThis.fetch = originalFetch; });

describe("enlaces de checkout", () => {
  test("acepta solamente HTTPS y hosts exactos de Mercado Pago", () => {
    expect(safeCheckoutUrl("https://www.mercadopago.com.ar/subscriptions/checkout?preapproval_id=123")).not.toBeNull();
    for (const url of ["javascript:alert(1)", "//www.mercadopago.com.ar/x", "http://www.mercadopago.com.ar/x", "https://www.mercadopago.com.ar.evil.test/x", "https://evilmercadopago.com/x", "https://user:pass@www.mercadopago.com.ar/x", "https://www.mercadopago.com.ar:444/x", "https://evil.test/?next=https://www.mercadopago.com.ar", "null"]) expect(safeCheckoutUrl(url)).toBeNull();
  });
});

test("distingue autorización, estados terminales, desconocidos y facturas", () => {
  expect(subscriptionLabel("authorized")).toContain("no confirma un pago");
  for (const status of [null, "pending", "paused", "cancelled", "finished"]) expect(subscriptionLabel(status)).not.toContain("desconocido");
  expect(subscriptionLabel("new-status")).toContain("desconocido");
  expect(invoiceLabel("paid")).toBe("Pagada");
  expect(invoiceLabel("pending")).toBe("Pendiente de pago");
  expect(invoiceLabel("void")).toBe("Anulada");
  expect(invoiceLabel("new-status")).toContain("desconocido");
});

test("sin sesión, sesión inválida o cajero no llama al backend ni redirige", async () => {
  for (const state of [{ status: "invalid" }, { status: "expired" }, { status: "unavailable" }, { status: "valid", payload: { role: "CASHIER" } }]) {
    session = state;
    expect((await loadBilling()).ok).toBe(false);
  }
  expect(calls).toHaveLength(0);
});

test("renueva sesión ausente con cookies existentes", async () => {
  token = undefined; jar.set("bb_dashboard_rt", "old");
  refreshResult = { status: "ok", token: "renewed", cookie: { value: "rotated", maxAge: 60 } };
  expect((await loadBilling()).ok).toBe(true);
  expect(jar.get("bb_dashboard_rt")).toBe("rotated");
  expect(jar.get("d_token")).toBe("renewed");
  expect(calls[0].headers.Authorization).toBe("Bearer renewed");
});

test("pago solo consulta organización, sin planes ni facturas", async () => {
  const result = await loadBilling();
  expect(result).toEqual({ ok: true, data: { organization: org } });
  expect(calls.map(call => call.path)).toEqual(["/organization"]);
  expect(calls.every(call => call.cache === "no-store")).toBe(true);
});

test("planes carga catálogo real después de verificar organización", async () => {
  const plans = [{ id: planId, name: "Inicial", price: 1234.56, currency: "ARS" }];
  respond = path => Response.json(path === "/organization" ? org : plans);
  expect(await getBillingPlans(org.id)).toEqual({ ok: true, data: { organization: org, plans } });
  expect(calls.map(call => call.path)).toEqual(["/organization", "/organization/billing-plans"]);
});

test("planes propaga catálogo no disponible sin inventar alternativas", async () => {
  respond = path => path === "/organization" ? Response.json(org) : new Response("", { status: 503 });
  expect(await getBillingPlans(org.id)).toMatchObject({ ok: false, status: 503 });
});

test("ambas pantallas rechazan otro negocio antes de cargar catálogo", async () => {
  expect(await loadBilling(planId)).toMatchObject({ ok: false, status: 409 });
  expect(await getBillingPlans(planId)).toMatchObject({ ok: false, status: 409 });
  expect(calls.map(call => call.path)).toEqual(["/organization", "/organization"]);
  expect((await loadBilling(org.id)).ok).toBe(true);
});

test("rechazo de sesión al cargar planes descarta los datos", async () => {
  respond = path => path === "/organization" ? Response.json(org) : new Response("", { status: 401 });
  expect(await getBillingPlans()).toMatchObject({ ok: false, status: 401 });
});

test("maneja JSON inválido, contrato incorrecto, errores HTTP y red", async () => {
  for (const response of [new Response("<html>"), Response.json({ id: "bad" }), new Response("", { status: 403 }), new Response("", { status: 409 }), new Response("", { status: 500 })]) {
    respond = () => response;
    expect((await billingRequest("token", "/organization", billingOrganizationSchema)).ok).toBe(false);
  }
  respond = () => { throw new Error("offline"); };
  expect((await billingRequest("token", "/organization", z.object({}))).ok).toBe(false);
});

test("selección usa exclusivamente billingPlanId, sin inventar ciclo", async () => {
  respond = path => Response.json(path === "/organization/billing-plans" ? [{ id: planId, name: "Inicial", price: 1234, currency: "ARS" }] : org);
  expect((await selectBillingPlan(org.id, planId)).ok).toBe(true);
  expect(calls[2].method).toBe("PUT");
  expect(JSON.parse(calls[2].body)).toEqual({ billingPlanId: planId });
});

test("no guarda un ID ausente del catálogo ni un UUID inválido", async () => {
  expect((await selectBillingPlan(org.id, "bad-id")).ok).toBe(false);
  expect(calls).toHaveLength(0);
  expect((await selectBillingPlan(org.id, planId)).ok).toBe(false);
  expect(calls.every(call => call.method !== "PUT")).toBe(true);
});

test("nombres repetidos conservan IDs y precios separados", async () => {
  const plans = [
    { id: planId, name: "Inicial", price: 100, currency: "ARS" },
    { id: org.id, name: "Inicial", price: 200, currency: "ARS" },
  ];
  respond = path => Response.json(path === "/organization" ? org : plans);
  expect((await getBillingPlans()).data.plans).toEqual(plans);
  expect((await loadBilling()).data).toEqual({ organization: org });
});

test("sin plan no inicia checkout", async () => {
  respond = () => Response.json({ ...org, billingPlanName: null });
  expect((await startCheckout(org.id, "pagador@example.com")).ok).toBe(false);
  expect(calls.every(call => call.method !== "POST")).toBe(true);
});

test("checkout envía correo sin back URL ni estado del navegador y valida respuesta", async () => {
  respond = path => Response.json(path === "/organization" ? org : { initPoint: "https://www.mercadopago.com.ar/subscriptions/checkout", status: "pending" });
  expect((await startCheckout(org.id, " pagador@example.com ")).ok).toBe(true);
  expect(calls.filter(call => call.method === "POST")).toHaveLength(1);
  expect(JSON.parse(calls[1].body)).toEqual({ payerEmail: "pagador@example.com" });
  respond = path => Response.json(path === "/organization" ? org : { initPoint: "https://evil.test", status: "pending" });
  expect((await startCheckout(org.id, "pagador@example.com")).ok).toBe(false);
});

test("no vuelve a elegir plan después de autorizar Mercado Pago", async () => {
  respond = () => Response.json({ ...org, mercadoPagoSubscriptionStatus: "authorized" });
  const result = await selectBillingPlan(org.id, planId);
  expect(result.ok).toBe(false);
  expect(calls).toHaveLength(1);
  expect(calls[0].path).toBe("/organization");
  expect(calls.every(call => !call.method)).toBe(true);
});

test("no crea checkout autorizado ni muta otra organización", async () => {
  respond = () => Response.json({ ...org, mercadoPagoSubscriptionStatus: "authorized" });
  expect((await startCheckout(org.id, "pagador@example.com")).ok).toBe(false);
  expect((await selectBillingPlan(planId, planId)).ok).toBe(false);
  expect(calls.every(call => !call.method)).toBe(true);
});

test("cancelación usa DELETE y logout borra solo cookies dashboard", async () => {
  respond = () => Response.json(org);
  expect((await cancelBillingSubscription(org.id)).ok).toBe(true);
  expect(calls[1]).toMatchObject({ path: "/organization/billing/subscription", method: "DELETE" });
  jar.set("access_token", "customer"); jar.set("d_token", "admin"); jar.set("bb_dashboard_rt", "refresh"); jar.set("d_storefronts", "[]");
  await leaveBilling();
  expect([...jar.entries()]).toEqual([["access_token", "customer"]]);
});
