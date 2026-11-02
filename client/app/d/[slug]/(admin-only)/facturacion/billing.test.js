import { afterEach, beforeEach, describe, expect, mock, spyOn, test } from "bun:test";
import { UserRole } from "@/lib/definitions";

// Run this file in its own Bun process: module mocks must not affect session tests.
const adminSession = {
  status: "valid",
  payload: { sub: "admin-id", username: "admin", role: UserRole.ADMIN, iat: 1, exp: 4_000_000_000 },
};
let token;
let session;
const getDashboardSessionToken = mock(async () => token);
const checkSession = mock(async (_token, _area) => session);

mock.module("server-only", () => ({}));
mock.module("@/lib/auth/session", () => ({ getDashboardSessionToken, checkSession }));

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
      expect(await getDashboardBilling()).toEqual({ organization: auth, invoices: auth });
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
    fetchMock.mockImplementation(async input => {
      return Response.json(String(input).endsWith("/organization/invoices") ? [invoice] : organization);
    });
    expect(await getDashboardBilling()).toEqual({
      organization: { ok: true, data: organization },
      invoices: { ok: true, data: [invoice] },
    });
    expect(fetchMock).toHaveBeenCalledTimes(2);
    for (const path of ["/organization", "/organization/invoices"]) {
      expect(fetchMock).toHaveBeenCalledWith(`${backendUrl}${path}`, expect.objectContaining({
        headers: { Authorization: "Bearer verified-admin-token" },
        cache: "no-store",
        redirect: "error",
      }));
    }
  });

  for (const failed of ["organization", "invoices"]) {
    test(`${failed} failure does not discard the other result`, async () => {
      for (const failure of ["http", "schema", "network"]) {
        fetchMock.mockClear();
        fetchMock.mockImplementation(async input => {
          const resource = String(input).endsWith("/organization/invoices") ? "invoices" : "organization";
          if (resource !== failed) return Response.json(resource === "organization" ? organization : [invoice]);
          if (failure === "network") throw new Error(upstreamSecret);
          return failure === "http"
            ? new Response(upstreamSecret, { status: 503 })
            : Response.json(resource === "organization" ? { id: "invalid" } : [{ ...invoice, amount: "invalid" }]);
        });
        const result = await getDashboardBilling();
        expect(result[failed]).toEqual({
          ok: false,
          error: expect.any(String),
          ...(failure === "http" ? { status: 503 } : {}),
        });
        if (failed === "organization") expect(result.invoices).toEqual({ ok: true, data: [invoice] });
        else expect(result.organization).toEqual({ ok: true, data: organization });
        expect(JSON.stringify(result)).not.toContain(upstreamSecret);
        expect(fetchMock).toHaveBeenCalledTimes(2);
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
