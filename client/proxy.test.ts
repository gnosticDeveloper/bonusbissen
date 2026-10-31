import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { afterEach, test } from "node:test";
import { exportSPKI, generateKeyPair, jwtVerify, SignJWT } from "jose";
import { NextRequest, NextResponse } from "next/server";
import { proxy } from "./proxy";
import { refreshSession } from "./lib/auth/refresh";

// Keep the key stable because session.ts caches it across test cases.
const { privateKey, publicKey } = await generateKeyPair("ES256", { extractable: true });
const publicKeyBody = (await exportSPKI(publicKey))
  .replace(/-----[^\n]+-----/g, "")
  .replace(/\s/g, "");
const maxAge = 3600;
const rawToken = () => randomBytes(32).toString("base64url");

let restoreFetch: (() => void) | undefined;

afterEach(() => {
  restoreFetch?.();
  restoreFetch = undefined;
});

async function jwt(role = "ADMIN", expired = false, sf?: string) {
  const now = Math.floor(Date.now() / 1000);
  return new SignJWT({ username: "regression", role, ...(sf ? { sf } : {}) })
    .setProtectedHeader({ alg: "ES256" })
    .setSubject("regression-user")
    .setIssuedAt(now - 120)
    .setExpirationTime(expired ? now - 60 : now + 3600)
    .sign(privateKey);
}

function request(path: string, cookies: Record<string, string> = {}, action = false) {
  return new NextRequest(`https://client.example${path}`, {
    method: action ? "POST" : "GET",
    headers: {
      cookie: Object.entries(cookies).map(([name, value]) => `${name}=${value}`).join("; "),
      ...(action ? { "next-action": "regression-action", "content-type": "text/plain" } : {}),
    },
    ...(action ? { body: "[]" } : {}),
  });
}

test("landing and onboarding stay public without refreshing unrelated sessions", async () => {
  const { getFetchCallCount } = mockBackend(() => { throw new Error("Public routes must not refresh sessions"); });
  for (const path of ["/", "/onboarding", "/onboarding/pago", "/billing?status=approved"]) {
    for (const action of [false, true]) {
      const response = await proxy(request(path, { access_token: "expired", bb_user_rt: rawToken() }, action));
      assert.equal(response.status, 200);
      assert.equal(response.headers.get("location"), null);
    }
  }
  assert.equal(getFetchCallCount(), 0);
});

test("public landing does not open protected routes or similar prefixes", async () => {
  for (const path of ["/b", "/d/private", "/onboarding-private", "/billing-private", "/billing/private"]) {
    const response = await proxy(request(path));
    assert.equal(response.status, 307);
    assert.equal(new URL(response.headers.get("location")!).pathname, path.startsWith("/d/") ? "/d/sign-in" : "/descubrir");
  }
});

function refreshed(token: string, rotated = rawToken()) {
  return Response.json({ token }, {
    headers: { "set-cookie": `bb_rt=${rotated}; Max-Age=${maxAge}; Path=/; HttpOnly; SameSite=Strict` },
  });
}

function mockBackend(
  refresh: (init: RequestInit | undefined) => Response | Promise<Response>,
  publicKeyResponse = () => Response.json({ algorithm: "ES256", format: "X.509", publicKey: publicKeyBody }),
) {
  const refreshCalls: RequestInit[] = [];
  let fetchCallCount = 0;
  assert.equal(restoreFetch, undefined, "install one backend mock per test");
  const originalFetch = globalThis.fetch;
  restoreFetch = () => { globalThis.fetch = originalFetch; };
  globalThis.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    fetchCallCount++;
    const url = new URL(input instanceof Request ? input.url : String(input));
    if (url.pathname === "/auth/public-key") {
      return publicKeyResponse();
    }
    assert.equal(url.pathname, "/auth/refresh", "unexpected backend endpoint");
    refreshCalls.push(init ?? {});
    return refresh(init);
  };
  return { refreshCalls, getFetchCallCount: () => fetchCallCount };
}

function assertRefreshCall(calls: RequestInit[], raw: string) {
  assert.equal(calls.length, 1);
  const init = calls[0];
  assert.equal(init.method, "POST");
  assert.equal(init.cache, "no-store");
  assert.equal(init.redirect, "error");
  const headers = new Headers(init.headers);
  assert.equal(headers.get("cookie"), `bb_rt=${raw}`);
  assert.equal(headers.get("x-requested-with"), "XMLHttpRequest");
  assert.ok(init.signal instanceof AbortSignal);
}

function forwardedCookies(response: NextResponse) {
  const header = response.headers.get("x-middleware-request-cookie");
  assert.ok(header, "rotated cookies must reach server components/actions");
  assert.ok(response.headers.get("x-middleware-override-headers")?.split(",").includes("cookie"));
  return new NextRequest("https://client.example", { headers: { cookie: header } }).cookies;
}

function assertRestored(response: NextResponse, area: "dashboard" | "customer", token: string, rotated: string) {
  const accessName = area === "dashboard" ? "d_token" : "access_token";
  const refreshName = area === "dashboard" ? "bb_dashboard_rt" : "bb_user_rt";
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("location"), null);
  assert.equal(response.headers.get("x-middleware-next"), "1");
  assert.equal(response.headers.get("cache-control"), "private, no-store");
  const access = response.cookies.get(accessName);
  assert.equal(access?.value, token);
  assert.equal(access?.httpOnly, true);
  assert.equal(access?.sameSite, "lax");
  const refresh = response.cookies.get(refreshName);
  assert.equal(refresh?.value, rotated);
  assert.equal(refresh?.httpOnly, true);
  assert.equal(refresh?.sameSite, "strict");
  assert.equal(refresh?.path, "/");
  assert.equal(refresh?.maxAge, maxAge);
  // Secure is intentionally environment-dependent, unlike HttpOnly and SameSite.
  assert.equal(Boolean(refresh?.secure), process.env.NODE_ENV === "production");
  assert.equal(Boolean(access?.secure), process.env.NODE_ENV === "production");
  const forwarded = forwardedCookies(response);
  assert.equal(forwarded.get(accessName)?.value, token);
  assert.equal(forwarded.get(refreshName)?.value, rotated);
}

function assertDashboardCleared(response: NextResponse) {
  assert.equal(response.status, 307);
  assert.equal(response.headers.get("location"), "https://client.example/d/sign-in");
  const deleted = response.cookies.getAll();
  assert.deepEqual(deleted.map(({ name }) => name).sort(), ["bb_dashboard_rt", "d_storefronts", "d_token"]);
  for (const cookie of deleted) {
    assert.equal(cookie.value, "");
    assert.ok(cookie.expires instanceof Date);
    assert.equal(cookie.expires.getTime(), 0);
  }
  assert.equal(response.cookies.get("access_token"), undefined);
  assert.equal(response.cookies.get("bb_user_rt"), undefined);
}

for (const path of ["/d", "/d/store"]) {
  for (const expired of [false, true]) {
    test(`${path}: refreshes ${expired ? "expired" : "missing"} dashboard JWT and forwards rotated cookies`, async () => {
      const raw = rawToken();
      const rotated = rawToken();
      const token = await jwt();
      const { refreshCalls } = mockBackend(() => refreshed(token, rotated));
      const response = await proxy(request(path, {
        bb_dashboard_rt: raw,
        ...(expired ? { d_token: await jwt("ADMIN", true) } : {}),
        access_token: "untouched-customer-access",
        bb_user_rt: "untouched-customer-refresh",
        d_storefronts: "store-list",
      }));
      assertRestored(response, "dashboard", token, rotated);
      assertRefreshCall(refreshCalls, raw);
      const forwarded = forwardedCookies(response);
      assert.equal(forwarded.get("access_token")?.value, "untouched-customer-access");
      assert.equal(forwarded.get("bb_user_rt")?.value, "untouched-customer-refresh");
      assert.equal(forwarded.get("d_storefronts")?.value, "store-list");
      assert.deepEqual(response.cookies.getAll().map(({ name }) => name).sort(), ["bb_dashboard_rt", "d_token"]);
    });
  }
}

test("dashboard rejects a refreshed USER JWT", async () => {
  const raw = rawToken();
  const { refreshCalls } = mockBackend(() => refreshedToken);
  const refreshedToken = refreshed(await jwt("USER"));
  assertDashboardCleared(await proxy(request("/d/store", { bb_dashboard_rt: raw })));
  assertRefreshCall(refreshCalls, raw);
});

test("dashboard refresh preserves the signed storefront sf claim in browser and forwarded JWTs", async () => {
  const raw = rawToken();
  const rotated = rawToken();
  const sf = "regression-storefront";
  const token = await jwt("CASHIER", false, sf);
  const { refreshCalls } = mockBackend(() => refreshed(token, rotated));
  const response = await proxy(request("/d/store", {
    d_token: await jwt("CASHIER", true, sf), bb_dashboard_rt: raw,
  }));
  assertRestored(response, "dashboard", token, rotated);
  assertRefreshCall(refreshCalls, raw);
  for (const stored of [response.cookies.get("d_token"), forwardedCookies(response).get("d_token")]) {
    assert.ok(stored);
    const { payload } = await jwtVerify(stored.value, publicKey, { algorithms: ["ES256"] });
    assert.equal(payload.sf, sf);
    assert.equal(payload.role, "CASHIER");
  }
});

test("dashboard accepts a refreshed CASHIER JWT", async () => {
  const raw = rawToken();
  const rotated = rawToken();
  const token = await jwt("CASHIER");
  const { refreshCalls } = mockBackend(() => refreshed(token, rotated));
  assertRestored(await proxy(request("/d", { bb_dashboard_rt: raw })), "dashboard", token, rotated);
  assertRefreshCall(refreshCalls, raw);
});

for (const invalid of ["not-a-jwt", "wrong-signature"]) {
  test(`invalid dashboard JWT (${invalid}) never triggers refresh`, async () => {
    let token = invalid;
    if (invalid === "wrong-signature") {
      const other = await generateKeyPair("ES256");
      const now = Math.floor(Date.now() / 1000);
      token = await new SignJWT({ username: "regression", role: "ADMIN" })
        .setProtectedHeader({ alg: "ES256" }).setSubject("user")
        .setIssuedAt(now).setExpirationTime(now + 3600).sign(other.privateKey);
    }
    const { refreshCalls } = mockBackend(() => { throw new Error("must not refresh invalid JWT"); });
    assertDashboardCleared(await proxy(request("/d/store", { d_token: token, bb_dashboard_rt: rawToken() })));
    assert.equal(refreshCalls.length, 0);
  });
}

test("refresh 401 clears only dashboard access, refresh, and storefront cookies", async () => {
  const raw = rawToken();
  const { refreshCalls } = mockBackend(() => new Response(null, { status: 401 }));
  assertDashboardCleared(await proxy(request("/d/store", {
    d_token: await jwt("ADMIN", true), bb_dashboard_rt: raw, d_storefronts: "stores",
    access_token: await jwt("USER"), bb_user_rt: rawToken(), unrelated: "keep",
  })));
  assertRefreshCall(refreshCalls, raw);
});

for (const failure of ["http", "network", "malformed-response"]) {
  test(`refresh unavailable (${failure}) returns 503 without deleting cookies`, async () => {
    const raw = rawToken();
    const { refreshCalls } = mockBackend(() => {
      if (failure === "network") throw new TypeError("network unavailable");
      if (failure === "malformed-response") return Response.json({ token: "missing-refresh-cookie" });
      return new Response(null, { status: 503 });
    });
    const response = await proxy(request("/d/store", { bb_dashboard_rt: raw, d_storefronts: "stores" }));
    assert.equal(response.status, 503);
    assert.equal(response.headers.get("location"), null);
    assert.equal(response.headers.get("set-cookie"), null);
    assert.equal(response.cookies.getAll().length, 0);
    assertRefreshCall(refreshCalls, raw);
  });
}

test("dashboard refresh cooldown returns 503 without replay or cookie deletion", async () => {
  const raw = rawToken();
  const { refreshCalls } = mockBackend(() => refreshedToken);
  const refreshedToken = refreshed(await jwt());
  assert.equal((await refreshSession(raw)).status, "ok");
  const response = await proxy(request("/d", { bb_dashboard_rt: raw }));
  assert.equal(response.status, 503);
  assert.equal(response.headers.get("set-cookie"), null);
  assertRefreshCall(refreshCalls, raw);
});

for (const expired of [false, true]) {
  test(`/b customer ${expired ? "expired" : "missing"} JWT refresh stays independent of dashboard`, async () => {
    const raw = rawToken();
    const rotated = rawToken();
    const token = await jwt("USER");
    const dashboardToken = await jwt();
    const dashboardRefresh = rawToken();
    const { refreshCalls } = mockBackend(() => refreshed(token, rotated));
    const response = await proxy(request("/b", {
      bb_user_rt: raw, ...(expired ? { access_token: await jwt("USER", true) } : {}),
      d_token: dashboardToken, bb_dashboard_rt: dashboardRefresh, d_storefronts: "stores",
    }));
    assertRestored(response, "customer", token, rotated);
    assertRefreshCall(refreshCalls, raw);
    const forwarded = forwardedCookies(response);
    assert.equal(forwarded.get("d_token")?.value, dashboardToken);
    assert.equal(forwarded.get("bb_dashboard_rt")?.value, dashboardRefresh);
    assert.equal(forwarded.get("d_storefronts")?.value, "stores");
    assert.deepEqual(response.cookies.getAll().map(({ name }) => name).sort(), ["access_token", "bb_user_rt"]);
  });
}

for (const path of ["/descubrir", "/d/sign-in"]) {
  test(`${path} remains public and does not fetch or refresh`, async () => {
    const { getFetchCallCount } = mockBackend(() => { throw new Error("public route must not refresh"); });
    const scenarios: Record<string, string>[] = [
      {}, { d_token: "invalid", bb_dashboard_rt: rawToken(), bb_user_rt: rawToken() },
    ];
    for (const cookies of scenarios) {
      const response = await proxy(request(path, cookies));
      assert.equal(response.status, 200);
      assert.equal(response.headers.get("x-middleware-next"), "1");
      assert.equal(response.headers.get("location"), null);
      assert.equal(response.headers.get("set-cookie"), null);
    }
    assert.equal(getFetchCallCount(), 0);
  });
}

test("protected dashboard server-action POST refreshes without redirect", async () => {
  const raw = rawToken();
  const rotated = rawToken();
  const token = await jwt();
  const { refreshCalls } = mockBackend(() => refreshed(token, rotated));
  const response = await proxy(request("/d/store", {
    d_token: await jwt("ADMIN", true), bb_dashboard_rt: raw,
  }, true));
  assertRestored(response, "dashboard", token, rotated);
  assert.equal(response.headers.get("x-middleware-request-next-action"), "regression-action");
  assertRefreshCall(refreshCalls, raw);
});

test("refreshSession rejects arbitrary cookie/header content without fetch", async () => {
  const { getFetchCallCount } = mockBackend(() => { throw new Error("invalid raw cookie must not fetch"); });
  for (const raw of ["", "a".repeat(42), "a".repeat(44), "a".repeat(42) + "=", "a".repeat(42) + ";",
    "bb_rt=" + rawToken(), rawToken() + "; injected=value", rawToken() + "\r\nX-Injected: yes", "é".repeat(43)]) {
    assert.deepEqual(await refreshSession(raw), { status: "expired" }, JSON.stringify(raw));
  }
  assert.equal(getFetchCallCount(), 0);
});

test("refreshSession coalesces concurrent calls and cooldown never replays a rotated cookie", async () => {
  const raw = rawToken();
  const rotated = rawToken();
  const token = await jwt();
  let release!: (response: Response) => void;
  const gate = new Promise<Response>((resolve) => { release = resolve; });
  const { refreshCalls } = mockBackend(() => gate);
  const first = refreshSession(raw);
  const second = refreshSession(raw);
  const third = refreshSession(raw);
  assertRefreshCall(refreshCalls, raw);
  release(refreshed(token, rotated));
  const results = await Promise.all([first, second, third]);
  for (const result of results) {
    assert.deepEqual(result, { status: "ok", token, cookie: { value: rotated, maxAge } });
    assert.strictEqual(result, results[0]);
  }
  assert.deepEqual(await refreshSession(raw), { status: "retry" });
  assertRefreshCall(refreshCalls, raw);
});

test("refreshSession also blocks replay after a network failure", async () => {
  const raw = rawToken();
  const { refreshCalls } = mockBackend(() => { throw new TypeError("response lost after rotation"); });
  assert.deepEqual(await refreshSession(raw), { status: "unavailable" });
  assert.deepEqual(await refreshSession(raw), { status: "retry" });
  assertRefreshCall(refreshCalls, raw);
});

test("verification key unavailable after refresh persists only the rotated refresh cookie on 503", async () => {
  const raw = rawToken();
  const rotated = rawToken();
  const token = await jwt();
  let publicKeyCalls = 0;
  const { refreshCalls, getFetchCallCount } = mockBackend(
    () => refreshed(token, rotated),
    () => {
      publicKeyCalls++;
      return new Response(null, { status: 503 });
    },
  );
  const originalNow = Date.now;
  // Expire the seven-minute public-key cache populated by earlier tests.
  Date.now = () => originalNow() + 8 * 60 * 1000;
  try {
    const response = await proxy(request("/d/store", { bb_dashboard_rt: raw }));
    assertRefreshCall(refreshCalls, raw);
    assert.equal(publicKeyCalls, 1);
    assert.equal(getFetchCallCount(), 2);
    assert.equal(response.status, 503);
    assert.equal(response.headers.get("cache-control"), "private, no-store");
    assert.equal(response.headers.get("location"), null);
    assert.equal(response.headers.get("x-middleware-next"), null);
    assert.equal(response.headers.get("x-middleware-request-cookie"), null);
    assert.deepEqual(response.cookies.getAll().map(({ name }) => name), ["bb_dashboard_rt"]);
    assert.equal(response.cookies.get("d_token"), undefined);
    const refresh = response.cookies.get("bb_dashboard_rt");
    assert.equal(refresh?.value, rotated);
    assert.equal(refresh?.maxAge, maxAge);
    assert.equal(refresh?.httpOnly, true);
    assert.equal(refresh?.sameSite, "strict");
    assert.equal(refresh?.path, "/");
    assert.equal(Boolean(refresh?.secure), process.env.NODE_ENV === "production");
  } finally {
    Date.now = originalNow;
  }
});
