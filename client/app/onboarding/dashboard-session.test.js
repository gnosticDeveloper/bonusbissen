import { afterAll, beforeEach, describe, expect, mock, test } from "bun:test";
import { exportSPKI, generateKeyPair, SignJWT } from "jose";

// Run separately from onboarding.test.js: this suite uses the real checkSession.
const OWNER = "33333333-3333-4333-8333-333333333333";
const ORG = "44444444-4444-4444-8444-444444444444";
const REFRESH = "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
const keys = await generateKeyPair("ES256");
const otherKeys = await generateKeyPair("ES256");
const publicKey = (await exportSPKI(keys.publicKey)).replace(/-----[^\n]+-----|\s/g, "");
const jar = new Map();
const calls = [];
let staffToken;
let customerToken;
let exchangeResponse;
const setCookie = mock((name, value) => jar.set(name, value));
mock.module("server-only", () => ({}));
mock.module("next/headers", () => ({ cookies: async () => ({
  get: name => jar.has(name) ? { value: jar.get(name) } : undefined,
  set: setCookie,
}) }));
mock.module("next/navigation", () => ({ redirect: path => { throw new Error(`Unexpected redirect: ${path}`); } }));

const originalFetch = globalThis.fetch;
globalThis.fetch = mock(async (url, init = {}) => {
  const path = new URL(url).pathname;
  calls.push({ path, ...init });
  if (path === "/auth/public-key") return Response.json({ algorithm: "ES256", format: "X.509", publicKey });
  if (path === "/auth/dashboard/session") return exchangeResponse();
  throw new Error(`Unexpected request: ${path}`);
});

const { exchangeDashboardSession } = await import("./dashboard-session");

async function issue(claims = {}, privateKey = keys.privateKey, expiration = "5m") {
  return new SignJWT({ username: "ana", role: "ADMIN", ...claims })
    .setProtectedHeader({ alg: "ES256" })
    .setSubject(claims.sub ?? OWNER)
    .setIssuedAt()
    .setExpirationTime(expiration)
    .sign(privateKey);
}

function exchanged(token, { cookie = `bb_rt=${REFRESH}; Path=/auth; Max-Age=2592000; HttpOnly; SameSite=None` } = {}) {
  const headers = new Headers({ "Content-Type": "application/json" });
  if (cookie) headers.set("set-cookie", cookie);
  return new Response(JSON.stringify({ token, storefronts: [] }), { status: 200, headers });
}

const exchangeCalls = () => calls.filter(c => c.path === "/auth/dashboard/session");

beforeEach(async () => {
  jar.clear();
  calls.length = 0;
  setCookie.mockClear();
  customerToken = await issue({ role: "USER" });
  staffToken = await issue();
  jar.set("access_token", customerToken);
  exchangeResponse = () => exchanged(staffToken);
});
afterAll(() => { globalThis.fetch = originalFetch; });

describe("canje de sesión de cuenta por sesión de panel", () => {
  test("persiste el JWT ADMIN firmado y su refresh, sin escribir otras cookies", async () => {
    expect(await exchangeDashboardSession(ORG)).toBe(true);
    expect(jar.get("d_token")).toBe(staffToken);
    expect(jar.get("bb_dashboard_rt")).toBe(REFRESH);
    expect(setCookie.mock.calls.map(([name]) => name)).toEqual(["bb_dashboard_rt", "d_token"]);
    expect(setCookie).toHaveBeenCalledWith("d_token", staffToken, expect.objectContaining({ httpOnly: true, sameSite: "lax", path: "/" }));
    expect(setCookie).toHaveBeenCalledWith("bb_dashboard_rt", REFRESH, expect.objectContaining({ httpOnly: true, sameSite: "strict", maxAge: 2592000 }));
  });

  test("envía el token de cuenta y el negocio verificado", async () => {
    await exchangeDashboardSession(ORG);
    const [exchange] = exchangeCalls();
    expect(exchange).toMatchObject({ method: "POST", cache: "no-store", body: JSON.stringify({ organizationId: ORG }) });
    expect(exchange.headers).toMatchObject({ "Content-Type": "application/json", Authorization: `Bearer ${customerToken}` });
  });

  test("no llama al endpoint cuando ya hay sesión de panel vigente", async () => {
    jar.set("d_token", staffToken);
    expect(await exchangeDashboardSession(ORG)).toBe(true);
    expect(exchangeCalls()).toHaveLength(0);
    expect(setCookie).not.toHaveBeenCalled();
  });

  test("reintenta el canje cuando la sesión de panel está vencida", async () => {
    jar.set("d_token", await issue({}, keys.privateKey, "-1s"));
    expect(await exchangeDashboardSession(ORG)).toBe(true);
    expect(exchangeCalls()).toHaveLength(1);
    expect(jar.get("d_token")).toBe(staffToken);
  });

  test("sin sesión de cuenta no llama al endpoint ni cambia cookies", async () => {
    jar.delete("access_token");
    expect(await exchangeDashboardSession(ORG)).toBe(false);
    expect(exchangeCalls()).toHaveLength(0);
    expect(setCookie).not.toHaveBeenCalled();
  });

  test.each([401, 403, 409, 500])("ante %i no escribe cookies de panel", async status => {
    exchangeResponse = () => new Response("{}", { status });
    expect(await exchangeDashboardSession(ORG)).toBe(false);
    expect(setCookie).not.toHaveBeenCalled();
    expect(jar.has("d_token")).toBe(false);
  });

  test("ante una falla de red no escribe cookies de panel", async () => {
    exchangeResponse = () => { throw new Error("network down"); };
    expect(await exchangeDashboardSession(ORG)).toBe(false);
    expect(setCookie).not.toHaveBeenCalled();
    expect(jar.has("d_token")).toBe(false);
  });

  test("sin refresh en la respuesta no persiste la sesión", async () => {
    exchangeResponse = () => exchanged(staffToken, { cookie: null });
    expect(await exchangeDashboardSession(ORG)).toBe(false);
    expect(setCookie).not.toHaveBeenCalled();
  });

  test.each([
    ["rol de cuenta", { role: "USER" }, keys.privateKey],
    ["otra clave", {}, otherKeys.privateKey],
  ])("rechaza un token con %s sin persistirlo", async (_name, claims, privateKey) => {
    const rejected = await issue(claims, privateKey);
    exchangeResponse = () => exchanged(rejected);
    expect(await exchangeDashboardSession(ORG)).toBe(false);
    expect(setCookie).not.toHaveBeenCalled();
    expect(jar.has("d_token")).toBe(false);
  });

  test("rechaza un token ADMIN vencido sin persistirlo", async () => {
    const stale = await issue({}, keys.privateKey, "-1s");
    exchangeResponse = () => exchanged(stale);
    expect(await exchangeDashboardSession(ORG)).toBe(false);
    expect(setCookie).not.toHaveBeenCalled();
  });
});
