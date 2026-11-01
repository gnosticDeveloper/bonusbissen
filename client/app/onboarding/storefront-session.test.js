import { afterAll, beforeEach, describe, expect, mock, test } from "bun:test";
import { exportSPKI, generateKeyPair, SignJWT } from "jose";

// Run separately from onboarding.test.js: this suite uses the real checkSession.
const OWNER = "33333333-3333-4333-8333-333333333333";
const SF = "55555555-5555-4555-8555-555555555555";
const OTHER_SF = "66666666-6666-4666-8666-666666666666";
const keys = await generateKeyPair("ES256");
const otherKeys = await generateKeyPair("ES256");
const publicKey = (await exportSPKI(keys.publicKey)).replace(/-----[^\n]+-----|\s/g, "");
const jar = new Map();
const calls = [];
let responseToken;
let currentToken;
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
  if (path === "/auth/storefront") return Response.json({ token: responseToken, storefronts: [{ id: SF, name: "Centro" }, { id: OTHER_SF, name: "Otra" }] });
  throw new Error(`Unexpected request: ${path}`);
});

const { selectStorefront } = await import("../d/sign-in/actions");
const { checkSession } = await import("../../lib/auth/session");

async function issue(claims = {}, privateKey = keys.privateKey, expiration = "5m") {
  return new SignJWT({ username: "ana", role: "ADMIN", ...claims })
    .setProtectedHeader({ alg: "ES256" })
    .setSubject(claims.sub ?? OWNER)
    .setIssuedAt()
    .setExpirationTime(expiration)
    .sign(privateKey);
}

beforeEach(async () => {
  jar.clear();
  calls.length = 0;
  setCookie.mockClear();
  currentToken = await issue();
  responseToken = await issue({ sf: SF });
  jar.set("d_token", currentToken);
  jar.set("bb_dashboard_rt", "opaque-refresh");
});
afterAll(() => { globalThis.fetch = originalFetch; });

describe("selección de sucursal: firma real y cookies", () => {
  test("persiste el JWT firmado por backend con sf y conserva refresh y otros locales", async () => {
    expect(await selectStorefront(SF)).toEqual({ success: true });
    expect(jar.get("d_token")).toBe(responseToken);
    expect((await checkSession(jar.get("d_token"), "dashboard")).payload.sf).toBe(SF);
    expect(jar.get("bb_dashboard_rt")).toBe("opaque-refresh");
    expect(JSON.parse(jar.get("d_storefronts")).map(s => s.id)).toEqual([SF, OTHER_SF]);
    const selection = calls.find(c => c.path === "/auth/storefront");
    expect(selection).toMatchObject({ method: "POST", cache: "no-store", body: JSON.stringify({ storefrontId: SF }) });
    expect(selection.headers).toMatchObject({ Authorization: `Bearer ${currentToken}`, Cookie: "bb_rt=opaque-refresh" });
    expect(setCookie).toHaveBeenCalledWith("d_token", responseToken, expect.objectContaining({ httpOnly: true, sameSite: "lax", path: "/" }));
  });

  test("envía el refresh actual al backend aunque el JWT ya tenga el mismo sf", async () => {
    currentToken = await issue({ sf: SF });
    jar.set("d_token", currentToken);
    jar.set("bb_dashboard_rt", "renewed-refresh");
    expect(await selectStorefront(SF)).toEqual({ success: true });
    const selections = calls.filter(c => c.path === "/auth/storefront");
    expect(selections).toHaveLength(1);
    expect(selections[0]).toMatchObject({
      method: "POST",
      body: JSON.stringify({ storefrontId: SF }),
      headers: { Authorization: `Bearer ${currentToken}`, Cookie: "bb_rt=renewed-refresh" },
    });
    expect(jar.get("bb_dashboard_rt")).toBe("renewed-refresh");
    expect(setCookie.mock.calls.map(([name]) => name)).toEqual(["d_token", "d_storefronts"]);
    expect((await checkSession(jar.get("d_token"), "dashboard")).payload.sf).toBe(SF);
  });

  test.each([
    ["sin sf", {}],
    ["otro local", { sf: OTHER_SF }],
    ["otra cuenta", { sf: SF, sub: "otra-cuenta" }],
    ["otro permiso", { sf: SF, role: "CASHIER" }],
  ])("rechaza token firmado con %s sin persistirlo", async (_name, claims) => {
    responseToken = await issue(claims);
    expect((await selectStorefront(SF)).success).toBe(false);
    expect(jar.get("d_token")).toBe(currentToken);
    expect(setCookie).not.toHaveBeenCalled();
  });

  test("rechaza firma de otra clave aunque el payload tenga sf correcto", async () => {
    responseToken = await issue({ sf: SF }, otherKeys.privateKey);
    expect((await selectStorefront(SF)).success).toBe(false);
    expect(jar.get("d_token")).toBe(currentToken);
    expect(setCookie).not.toHaveBeenCalled();
  });

  test("rechaza JWT vencido con sf correcto", async () => {
    responseToken = await issue({ sf: SF }, keys.privateKey, "-1s");
    expect((await selectStorefront(SF)).success).toBe(false);
    expect(setCookie).not.toHaveBeenCalled();
  });

  test("sin sesión no llama al endpoint ni cambia cookies", async () => {
    jar.delete("d_token");
    expect((await selectStorefront(SF)).success).toBe(false);
    expect(calls.some(c => c.path === "/auth/storefront")).toBe(false);
    expect(setCookie).not.toHaveBeenCalled();
  });
});
