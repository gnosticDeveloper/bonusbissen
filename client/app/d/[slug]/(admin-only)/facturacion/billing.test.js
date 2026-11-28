import { afterEach, beforeEach, describe, expect, mock, spyOn, test } from "bun:test";
import { UserRole } from "@/lib/types/user";

// Run this file in its own Bun process: module mocks must not affect session tests.
const adminSession = {
  status: "valid",
  payload: { sub: "admin-id", username: "admin", role: UserRole.ADMIN, iat: 1, exp: 4_000_000_000 },
};
let token;
let session;
const getDashboardSessionToken = mock(async () => token);
const checkSession = mock(async (_token, _area) => session);

let refreshResult = { status: "expired" };
const jar = new Map();

mock.module("server-only", () => ({}));
mock.module("next/headers", () => ({ headers: async () => new Headers(), cookies: async () => ({
  get: key => jar.has(key) ? { value: jar.get(key) } : undefined,
  set: (key, value) => jar.set(key, value),
  delete: key => jar.delete(key),
}) }));
mock.module("@/lib/auth/session", () => ({
  getDashboardSessionToken,
  getSessionToken: async () => undefined,
  checkSession,
  currentSession: async area => checkSession(await getDashboardSessionToken(), area),
  decodeJwt: () => ({ sub: "admin-id" }),
}));
mock.module("@/lib/auth/refresh", () => ({
  refreshSession: async () => refreshResult,
}));

// Import only after installing mocks; exercise the real helper, action and route.
const { billingAdminToken } = await import("@/lib/auth/billing-admin");
const { getDashboardBilling } = await import("./actions");
const { GET } = await import("./facturas/[invoiceId]/pdf/route");

const invoiceId = "123e4567-e89b-42d3-a456-426614174000";
const organization = {
  id: "123e4567-e89b-42d3-a456-426614174001",
  name: "Regression business",
  billingEmail: "billing@example.test",
  billingPlanName: "Standard",
  billingCycle: "monthly",
  nextInvoiceDueAt: "2026-12-01T00:00:00Z",
  mercadoPagoSubscriptionStatus: null,
};
const invoice = {
  id: invoiceId,
  invoiceNumber: 42,
  billingCycle: "monthly",
  dueAt: "2026-11-01T00:00:00Z",
  createdAt: "2026-10-01T00:00:00Z",
  amount: 1250,
  currency: "ARS",
  paymentStatus: "paid",
  overdue: false,
  paidAt: "2026-10-20T12:00:00Z",
  paymentReference: "manual-reconciliation-42",
};
const plan = { id: "123e4567-e89b-42d3-a456-426614174002", name: "Standard", price: 1250, currency: "ARS" };
const resourceOf = input => {
  const url = String(input);
  return url.endsWith("/organization/invoices") ? "invoices" : url.endsWith("/organization/billing-plans") ? "plans" : "organization";
};
const fixtures = { organization, invoices: [invoice], plans: [plan] };
const backendUrl = process.env.BACKEND_URL ?? "http://localhost:8080";
const upstreamSecret = "UPSTREAM_PRIVATE_BINARY_\u0000\u00ff";
const pdfBytes = new Uint8Array([37, 80, 68, 70, 45, 49, 46, 55, 10, 0, 128, 255, 10, 37, 37, 69, 79, 70]);

function installFetchMock() {
  return spyOn(globalThis, "fetch").mockImplementation(async () => {
    throw new Error("Unexpected backend fetch");
  });
}
let fetchMock;

beforeEach(() => {
  token = "verified-admin-token";
  session = adminSession;
  getDashboardSessionToken.mockClear();
  checkSession.mockClear();
  fetchMock = installFetchMock();
});
afterEach(() => {
  fetchMock.mockRestore();
});

function download(id = invoiceId) {
  return GET(new Request(`https://client.example/d/untrusted-slug/facturacion/facturas/${id}/pdf`), {
    params: Promise.resolve({ slug: "untrusted-slug", invoiceId: id }),
  });
}

function expectPrivate(response) {
  expect(response.headers.get("cache-control")).toBe("private, no-store");
  expect(response.headers.get("x-content-type-options")).toBe("nosniff");
}

async function expectFailure(response, status) {
  expect(response.status).toBe(status);
  expectPrivate(response);
  expect(response.headers.get("content-type")).toContain("application/json");
  expect(response.headers.get("content-disposition")).toBeNull();
  const body = await response.text();
  expect(JSON.parse(body)).toEqual({ error: expect.any(String) });
  expect(body).not.toContain(upstreamSecret);
  expect(body).not.toContain("verified-admin-token");
  expect(body).not.toContain("%PDF");
  return JSON.parse(body);
}

describe("billing administrator authorization", () => {
  const refusals = [
    { name: "invalid session", session: { status: "invalid" }, token: "invalid", status: 401 },
    { name: "expired session", session: { status: "expired" }, token: "expired", status: 401 },
    { name: "unavailable verification", session: { status: "unavailable" }, token: "unverified", status: 503 },
    {
      name: "CASHIER role",
      session: { status: "valid", payload: { ...adminSession.payload, role: UserRole.CASHIER } },
      token: "cashier",
      status: 403,
    },
    // A valid mocked session must not bypass the explicit token-presence check.
    { name: "missing token despite valid session", session: adminSession, status: 401 },
  ];

  for (const refusal of refusals) {
    test(`${refusal.name} refuses helper, action and PDF without fetching`, async () => {
      token = refusal.token;
      session = refusal.session;
      const auth = await billingAdminToken();
      expect(auth).toEqual({ ok: false, status: refusal.status, error: expect.any(String) });
      expect(await getDashboardBilling()).toEqual({ organization: auth, invoices: auth, plans: auth });
      const body = await expectFailure(await download(), refusal.status);
      if (!auth.ok) expect(body.error).toBe(auth.error);
      expect(getDashboardSessionToken).toHaveBeenCalledTimes(3);
      expect(checkSession).toHaveBeenCalledTimes(3);
      expect(checkSession).toHaveBeenCalledWith(refusal.token, "dashboard");
      expect(fetchMock).not.toHaveBeenCalled();
    });
  }
});

describe("dashboard billing data", () => {
  test("verified admin receives organization and a paid invoice with a neutral reference", async () => {
    expect(await billingAdminToken()).toEqual({ ok: true, data: token });
    fetchMock.mockImplementation(async input => Response.json(fixtures[resourceOf(input)]));
    expect(await getDashboardBilling()).toEqual({
      organization: { ok: true, data: organization },
      invoices: { ok: true, data: [invoice] },
      plans: { ok: true, data: [plan] },
    });
    expect(fetchMock).toHaveBeenCalledTimes(3);
    for (const path of ["/organization", "/organization/invoices", "/organization/billing-plans"]) {
      expect(fetchMock).toHaveBeenCalledWith(`${backendUrl}${path}`, expect.objectContaining({
        headers: { Authorization: "Bearer verified-admin-token" },
        cache: "no-store",
        redirect: "error",
      }));
    }
  });

  const invalid = { organization: { id: "invalid" }, invoices: [{ ...invoice, amount: "invalid" }], plans: [{ ...plan, price: -1 }] };
  for (const failed of ["organization", "invoices", "plans"]) {
    test(`${failed} failure does not discard the other results`, async () => {
      for (const failure of ["http", "schema", "network"]) {
        fetchMock.mockClear();
        fetchMock.mockImplementation(async input => {
          const resource = resourceOf(input);
          if (resource !== failed) return Response.json(fixtures[resource]);
          if (failure === "network") throw new Error(upstreamSecret);
          return failure === "http"
            ? new Response(upstreamSecret, { status: 503 })
            : Response.json(invalid[resource]);
        });
        const result = await getDashboardBilling();
        expect(result[failed]).toEqual({
          ok: false,
          error: expect.any(String),
          ...(failure === "http" ? { status: 503 } : {}),
        });
        for (const other of Object.keys(fixtures).filter(resource => resource !== failed)) {
          expect(result[other]).toEqual({ ok: true, data: fixtures[other] });
        }
        expect(JSON.stringify(result)).not.toContain(upstreamSecret);
        expect(fetchMock).toHaveBeenCalledTimes(3);
      }
    });
  }
});

describe("invoice PDF download", () => {
  test("forwards bearer to the organization-scoped backend and returns exact private attachment bytes", async () => {
    fetchMock.mockResolvedValue(new Response(pdfBytes, {
      headers: { "Content-Type": "application/pdf; charset=binary", "Content-Disposition": "inline; filename=untrusted.pdf" },
    }));
    const response = await download();
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith(`${backendUrl}/organization/invoices/${invoiceId}/pdf`, {
      headers: { Authorization: "Bearer verified-admin-token", Accept: "application/pdf" },
      cache: "no-store",
      redirect: "error",
      signal: expect.any(AbortSignal),
    });
    expect(response.status).toBe(200);
    expectPrivate(response);
    expect(response.headers.get("content-type")).toBe("application/pdf");
    expect(response.headers.get("content-disposition")).toBe(`attachment; filename="factura-${invoiceId}.pdf"`);
    expect(new Uint8Array(await response.arrayBuffer())).toEqual(pdfBytes);
  });

  test("rejects invalid invoice IDs before fetching", async () => {
    for (const id of ["not-a-uuid", "../another-organization", `${invoiceId}.pdf`]) {
      await expectFailure(await download(id), 400);
    }
    expect(fetchMock).not.toHaveBeenCalled();
  });

  const failures = [
    ...[401, 403, 404, 500].map(status => ({
      name: `backend ${status}`,
      upstream: () => new Response(`%PDF ${upstreamSecret}`, { status, headers: { "Content-Type": "application/pdf" } }),
      status: status === 500 ? 502 : status,
    })),
    {
      name: "non-PDF response",
      upstream: () => new Response(upstreamSecret, { headers: { "Content-Type": "text/html" } }),
      status: 502,
    },
    {
      name: "empty PDF",
      upstream: () => new Response(null, { headers: { "Content-Type": "application/pdf" } }),
      status: 502,
    },
    {
      name: "network or redirect rejection",
      upstream: async () => { throw new TypeError(upstreamSecret); },
      status: 502,
    },
  ];
  for (const failure of failures) {
    test(`${failure.name} returns a private JSON error without leaking binary data`, async () => {
      fetchMock.mockImplementation(failure.upstream);
      await expectFailure(await download(), failure.status);
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });
  }
});
