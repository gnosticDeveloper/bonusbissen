import { beforeEach, describe, expect, mock, test } from "bun:test";

// Run this file in its own Bun invocation: it replaces Next's cookie store.
const CUSTOMER = "customer-id";
const OTHER = "other-id";

const jar = new Map();
const cookieStore = {
  get: name => (jar.has(name) ? { value: jar.get(name) } : undefined),
  set: (name, value) => jar.set(name, value),
  delete: name => jar.delete(name),
};

/** Sessions keyed by access token, so each area can hold a different account. */
const sessions = new Map();
const logoutFromBackend = mock(async () => {});

mock.module("next/headers", () => ({ cookies: async () => cookieStore }));
mock.module("@/lib/auth/session", () => ({
  checkSession: async token => sessions.get(token) ?? { status: "invalid" },
  decodeJwt: token => ({ sub: sessions.get(token)?.payload?.sub ?? CUSTOMER }),
}));
mock.module("./session", () => ({
  checkSession: async token => sessions.get(token) ?? { status: "invalid" },
  decodeJwt: token => ({ sub: sessions.get(token)?.payload?.sub ?? CUSTOMER }),
}));
mock.module("./logout", () => ({ logoutFromBackend }));
mock.module("@/lib/auth/logout", () => ({ logoutFromBackend }));

const { clearAllSessions, saveCustomerSession, saveDashboardSession } = await import("./refresh");

const refreshResponse = () =>
  new Response(null, { headers: { "set-cookie": "bb_rt=0123456789012345678901234567890123456789abc; Max-Age=600" } });

function valid(sub, role = "USER") {
  return { status: "valid", payload: { sub, role, username: "ana" } };
}

beforeEach(() => {
  jar.clear();
  sessions.clear();
  logoutFromBackend.mockClear();
});

describe("one identity per browser", () => {
  test("a customer sign-in ends a dashboard session that belongs to someone else", async () => {
    jar.set("d_token", "foreign-dashboard");
    jar.set("bb_dashboard_rt", "foreign-refresh");
    jar.set("d_storefronts", "[]");
    sessions.set("foreign-dashboard", valid(OTHER, "ADMIN"));
    sessions.set("mine", valid(CUSTOMER));

    expect(await saveCustomerSession(refreshResponse(), "mine")).toBe(true);

    expect(jar.get("access_token")).toBe("mine");
    expect(jar.has("d_token")).toBe(false);
    expect(jar.has("bb_dashboard_rt")).toBe(false);
    // The storefront hint belongs to the session that just ended.
    expect(jar.has("d_storefronts")).toBe(false);
    expect(logoutFromBackend).toHaveBeenCalledWith("foreign-dashboard", "foreign-refresh");
  });

  test("onboarding keeps both areas when they are the same account", async () => {
    jar.set("access_token", "mine");
    jar.set("bb_user_rt", "my-refresh");
    sessions.set("mine", valid(CUSTOMER));
    sessions.set("staff", valid(CUSTOMER, "ADMIN"));

    expect(await saveDashboardSession(refreshResponse(), "staff")).toBe(true);

    expect(jar.get("access_token")).toBe("mine");
    expect(jar.get("bb_user_rt")).toBe("my-refresh");
    expect(jar.get("d_token")).toBe("staff");
    expect(logoutFromBackend).not.toHaveBeenCalled();
  });

  test("an unverifiable session is dropped locally but never revoked upstream", async () => {
    jar.set("d_token", "tampered");
    jar.set("bb_dashboard_rt", "unknown-refresh");
    sessions.set("mine", valid(CUSTOMER));

    expect(await saveCustomerSession(refreshResponse(), "mine")).toBe(true);

    expect(jar.has("d_token")).toBe(false);
    expect(jar.has("bb_dashboard_rt")).toBe(false);
    expect(logoutFromBackend).not.toHaveBeenCalled();
  });

  test("a rejected login leaves the existing session untouched", async () => {
    jar.set("d_token", "foreign-dashboard");
    sessions.set("foreign-dashboard", valid(OTHER, "ADMIN"));

    // No refresh cookie in the response: the login did not produce a session.
    expect(await saveCustomerSession(new Response(null), "mine")).toBe(false);

    expect(jar.get("d_token")).toBe("foreign-dashboard");
    expect(jar.has("access_token")).toBe(false);
    expect(logoutFromBackend).not.toHaveBeenCalled();
  });
});

describe("signing out", () => {
  test("ends both areas and revokes both backend sessions", async () => {
    jar.set("access_token", "mine");
    jar.set("bb_user_rt", "my-refresh");
    jar.set("d_token", "staff");
    jar.set("bb_dashboard_rt", "staff-refresh");
    jar.set("d_storefronts", "[]");

    await clearAllSessions();

    expect([...jar.keys()]).toEqual([]);
    expect(logoutFromBackend).toHaveBeenCalledWith("mine", "my-refresh");
    expect(logoutFromBackend).toHaveBeenCalledWith("staff", "staff-refresh");
  });
});
