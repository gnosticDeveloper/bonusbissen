import { afterAll, beforeEach, describe, expect, mock, test } from "bun:test";

// Run this suite in its own Bun invocation: module mocks replace Next's server runtime.
const ORG = "11111111-1111-4111-8111-111111111111";
const OTHER_ORG = "22222222-2222-4222-8222-222222222222";
const OWNER = "33333333-3333-4333-8333-333333333333";
const OTHER_OWNER = "44444444-4444-4444-8444-444444444444";
const SF = "55555555-5555-4555-8555-555555555555";
const OTHER_SF = "66666666-6666-4666-8666-666666666666";
const PROGRAM = "77777777-7777-4777-8777-777777777777";
const PROGRESS = "onboarding_progress";
const jar = new Map();
const calls = [];
let customerSession;
let adminSession;
let organization;
let storefronts;
let programs;
let failures;
let loginResult;
let loginSession;
let loseStorefrontResponse;
let loseProgramResponse;

function valid(role, sub = OWNER) {
  return { status: "valid", payload: { sub, role, username: "ana" } };
}
const setCookie = mock((name, value, options) => { jar.set(name, value); });
const cookieStore = {
  get: name => jar.has(name) ? { value: jar.get(name) } : undefined,
  set: setCookie,
};
class Redirect extends Error {
  constructor(path) { super(`NEXT_REDIRECT:${path}`); this.path = path; }
}
const redirect = mock(path => { throw new Redirect(path); });
const dashboardSignIn = mock(async form => {
  if (loginResult.ok) adminSession = loginSession;
  return loginResult;
});

mock.module("server-only", () => ({}));
mock.module("next/headers", () => ({ cookies: async () => cookieStore }));
mock.module("next/navigation", () => ({ redirect }));
mock.module("@/lib/auth/session", () => ({
  getSessionToken: async () => jar.get("access_token"),
  getDashboardSessionToken: async () => jar.get("d_token"),
  checkSession: async (_token, area) => area === "dashboard" ? adminSession : customerSession,
}));
mock.module("@/app/d/sign-in/actions", () => ({ signIn: dashboardSignIn }));
mock.module("@/app/(auth)/sign-in/actions", () => ({ signIn: mock(async () => ({ ok: true, data: null })) }));
mock.module("@/app/(auth)/sign-up/actions", () => ({ signUp: mock(async () => ({ ok: true, data: null })) }));

const originalFetch = globalThis.fetch;
globalThis.fetch = mock(async (url, init = {}) => {
  const path = new URL(url).pathname;
  const method = init.method ?? "GET";
  const body = init.body ? JSON.parse(init.body) : undefined;
  calls.push({ path, method, body, authorization: new Headers(init.headers).get("Authorization"), cache: init.cache });
  const failure = failures.get(`${method} ${path}`);
  if (failure) return Response.json({ detail: failure.detail }, { status: failure.status });
  if (method === "GET") {
    if (path === "/users/me") return Response.json({ id: OWNER });
    if (path === "/organization") return Response.json(organization);
    if (path === "/storefronts") return Response.json(storefronts);
    if (path === "/point-programs") return Response.json(programs);
  }
  if (method === "POST") {
    if (path === "/organizations") {
      organization = { id: ORG, name: body.name };
      return Response.json(organization, { status: 201 });
    }
    if (path === "/storefronts") {
      const created = { ...body, id: SF, active: true };
      storefronts.push(created);
      if (loseStorefrontResponse) throw new Error("Response lost after commit");
      return Response.json(created, { status: 201 });
    }
    if (path === "/point-programs") {
      const created = { id: PROGRAM, name: body.name, unitLabel: body.unitLabel, active: true, storefronts: storefronts.filter(s => body.storefrontIds.includes(s.id)) };
      programs.push(created);
      if (loseProgramResponse) throw new Error("Response lost after commit");
      return Response.json(created, { status: 201 });
    }
  }
  throw new Error(`Unexpected backend request: ${method} ${path}`);
});

const actions = await import("./actions");
const state = await import("./state");

function form(values) {
  const data = new FormData();
  for (const [key, value] of Object.entries(values)) data.set(key, value);
  return data;
}
function saveProgress(owner = OWNER, organizationId = ORG) {
  jar.set(PROGRESS, JSON.stringify({ organizationId, owner }));
}
function branch(overrides = {}) { return { id: SF, name: "Centro", active: true, online: true, ...overrides }; }
function program(overrides = {}) { return { id: PROGRAM, name: "Beneficios", unitLabel: "puntos", active: true, storefronts: [{ id: SF, name: "Centro" }], ...overrides }; }
function branchForm(overrides = {}) {
  return form({ name: "Centro", online: "true", address: "", city: "", province: "", color: "#d4822b", category: "", hours: "", description: "", ...overrides });
}
function programForm(overrides = {}) { return form({ name: "Beneficios", unitLabel: "puntos", storefrontId: SF, ...overrides }); }
function loginForm() { return form({ identifier: "ana", password: "NotStored123!", organizationId: OTHER_ORG }); }
function posts(path) { return calls.filter(c => c.method === "POST" && (!path || c.path === path)); }

beforeEach(() => {
  jar.clear();
  jar.set("access_token", "customer-token");
  jar.set("d_token", "dashboard-token");
  calls.length = 0;
  setCookie.mockClear();
  redirect.mockClear();
  dashboardSignIn.mockClear();
  customerSession = valid("USER");
  adminSession = valid("ADMIN");
  loginSession = valid("ADMIN");
  loginResult = { ok: true, data: { storefronts: [] } };
  organization = { id: ORG, name: "Café" };
  storefronts = [];
  programs = [];
  failures = new Map();
  loseStorefrontResponse = false;
  loseProgramResponse = false;
});
afterAll(() => { globalThis.fetch = originalFetch; });

describe("organización y reingreso", () => {
  test("crear, fallar login, recargar y reintentar no vuelve a crear ni guarda contraseñas", async () => {
    adminSession = { status: "invalid" };
    const created = await actions.createOrganization(form({ name: "  Café  " }));
    expect(created.ok).toBe(true);
    expect(posts("/organizations")).toHaveLength(1);
    expect(posts()[0]).toMatchObject({ body: { name: "Café" }, authorization: "Bearer customer-token" });
    const saved = jar.get(PROGRESS);
    expect(JSON.parse(saved)).toEqual({ organizationId: ORG, owner: OWNER });
    expect(setCookie.mock.calls[0][2]).toMatchObject({ httpOnly: true, path: "/onboarding", sameSite: "lax", maxAge: 604800 });

    loginResult = { ok: false, error: "Credenciales incorrectas" };
    expect(await actions.authenticateAdmin(loginForm())).toEqual(loginResult);
    expect(jar.get(PROGRESS)).toBe(saved);
    expect(setCookie).toHaveBeenCalledTimes(1);
    const login = dashboardSignIn.mock.calls[0][0];
    expect(login.get("organizationId")).toBe(ORG); // Cookie wins over a submitted different org.
    expect(login.get("identifier")).toBe("ana");
    expect(login.get("password")).toBe("NotStored123!");
    expect((await state.loadOnboarding()).organizationId).toBe(ORG);
    expect(await actions.createOrganization(form({ name: "Duplicado" }))).toMatchObject({ ok: true });
    expect(posts("/organizations")).toHaveLength(1);

    loginResult = { ok: true, data: { storefronts: [] } };
    expect(await actions.authenticateAdmin(loginForm())).toMatchObject({ ok: true, data: { organization } });
    expect([...jar.values()].join(" ")).not.toContain("NotStored123!");
    expect(posts("/organizations")).toHaveLength(1);
  });

  test("organización pendiente de otra cuenta rechaza el alta sin modificar progreso", async () => {
    saveProgress(OTHER_OWNER);
    const saved = jar.get(PROGRESS);
    expect(await actions.createOrganization(form({ name: "Nuevo" }))).toMatchObject({ ok: false });
    expect(posts()).toHaveLength(0);
    expect(jar.get(PROGRESS)).toBe(saved);
  });

  test("sesión customer vencida no llama al backend ni redirige fuera del recorrido", async () => {
    customerSession = { status: "expired" };
    jar.delete("access_token");
    expect(await actions.createOrganization(form({ name: "Nuevo" }))).toMatchObject({ ok: false });
    expect(calls).toHaveLength(0);
    expect(redirect).not.toHaveBeenCalled();
  });

  test("rechazo backend de customer no crea organización", async () => {
    failures.set("GET /users/me", { status: 401, detail: "Sesión revocada" });
    expect(await actions.createOrganization(form({ name: "Nuevo" }))).toMatchObject({ ok: false });
    expect(posts()).toHaveLength(0);
    expect(jar.has(PROGRESS)).toBe(false);
  });

  test("login exitoso con organización distinta no sobrescribe el progreso", async () => {
    saveProgress();
    organization.id = OTHER_ORG;
    const saved = jar.get(PROGRESS);
    expect(await actions.authenticateAdmin(loginForm())).toMatchObject({ ok: false });
    expect(jar.get(PROGRESS)).toBe(saved);
    expect(setCookie).not.toHaveBeenCalled();
  });

  test("login CASHIER no establece progreso ni consulta recursos", async () => {
    loginSession = valid("CASHIER");
    expect(await actions.authenticateAdmin(loginForm())).toMatchObject({ ok: false });
    expect(setCookie).not.toHaveBeenCalled();
    expect(calls).toHaveLength(0);
  });
});

describe("estado y autorización de operaciones independientes", () => {
  test.each(["invalid", "expired", "unavailable"])("sesión admin %s rechaza ambas creaciones sin backend", async status => {
    saveProgress();
    adminSession = { status };
    expect(await actions.createStorefront(branchForm())).toMatchObject({ ok: false, status: 401 });
    expect(await actions.createPointProgram(programForm())).toMatchObject({ ok: false, status: 401 });
    expect(calls).toHaveLength(0);
    expect(redirect).not.toHaveBeenCalled();
  });

  test("CASHIER no puede crear aunque el progreso exista", async () => {
    saveProgress();
    adminSession = valid("CASHIER");
    expect(await actions.createStorefront(branchForm())).toMatchObject({ ok: false, status: 403 });
    expect(await actions.createPointProgram(programForm())).toMatchObject({ ok: false, status: 403 });
    expect(calls).toHaveLength(0);
  });

  test("organización backend distinta impide lecturas de colecciones y escrituras", async () => {
    saveProgress();
    organization.id = OTHER_ORG;
    expect(await actions.createStorefront(branchForm())).toMatchObject({ ok: false, status: 401 });
    expect(await actions.createPointProgram(programForm())).toMatchObject({ ok: false, status: 401 });
    const resumed = await state.loadOnboarding();
    expect(resumed).toMatchObject({ organizationId: ORG, organization: null, storefronts: [], programs: [] });
    expect(resumed.error).toBeTruthy();
    expect(calls.every(c => ["/organization", "/users/me"].includes(c.path))).toBe(true);
    expect(posts()).toHaveLength(0);
  });

  test("backend puede revocar una sesión localmente válida", async () => {
    saveProgress();
    failures.set("GET /organization", { status: 403, detail: "Acceso revocado" });
    expect(await actions.createStorefront(branchForm())).toEqual({ ok: false, status: 403, error: "Acceso revocado" });
    expect(await actions.createPointProgram(programForm())).toEqual({ ok: false, status: 403, error: "Acceso revocado" });
    expect(posts()).toHaveLength(0);
  });

  test.each(["no-json", JSON.stringify({ organizationId: "invalid", owner: OWNER })])("cookie malformada no autoriza (%s)", async value => {
    jar.set(PROGRESS, value);
    expect(await state.readProgress()).toBeNull();
    expect(await state.adminOrganization()).toMatchObject({ ok: false });
    expect(await state.loadOnboarding()).toMatchObject({ organizationId: null, organization: null });
    expect(posts()).toHaveLength(0);
  });

  test("recarga lee backend sin caché y excluye recursos inactivos", async () => {
    saveProgress();
    storefronts = [branch(), branch({ id: OTHER_SF, active: false })];
    programs = [program(), program({ id: OTHER_ORG, active: false })];
    const resumed = await state.loadOnboarding();
    expect(resumed).toMatchObject({ customer: true, organization });
    expect(resumed.storefronts).toEqual([branch()]);
    expect(resumed.programs).toEqual([program()]);
    expect(calls.every(c => c.cache === "no-store")).toBe(true);
    expect(calls.filter(c => c.path !== "/users/me").every(c => c.authorization === "Bearer dashboard-token")).toBe(true);
  });

  test("error leyendo colecciones no se interpreta como negocio vacío", async () => {
    saveProgress();
    failures.set("GET /storefronts", { status: 503, detail: "No disponible" });
    expect(await state.loadOnboarding()).toMatchObject({ organization: null, error: "No disponible" });
    expect(await actions.createStorefront(branchForm())).toMatchObject({ ok: false, status: 503 });
    expect(posts()).toHaveLength(0);
  });
});

describe("sucursal y programa: reintentos y vínculos", () => {
  test("sucursal existente se recupera sin POST", async () => {
    saveProgress();
    storefronts = [branch()];
    expect(await actions.createStorefront(branchForm())).toMatchObject({ ok: true, data: { storefronts: [branch()] } });
    expect(posts()).toHaveLength(0);
  });

  test("respuesta perdida de sucursal: retry recupera una sola creación", async () => {
    saveProgress();
    loseStorefrontResponse = true;
    expect(await actions.createStorefront(branchForm())).toMatchObject({ ok: false });
    expect(await actions.createStorefront(branchForm())).toMatchObject({ ok: true });
    expect(posts("/storefronts")).toHaveLength(1);
    expect(storefronts).toHaveLength(1);
    expect(posts()[0].body).toMatchObject({ name: "Centro", online: true });
    expect(posts()[0].body).not.toHaveProperty("address");
  });

  test("sucursal física exige dirección y envía provincia/localidad/calle", async () => {
    saveProgress();
    expect(await actions.createStorefront(branchForm({ online: "false" }))).toMatchObject({ ok: false });
    expect(posts()).toHaveLength(0);
    expect(await actions.createStorefront(branchForm({ online: "false", province: "Santa Fe", city: "Rosario", address: "Urquiza 742" }))).toMatchObject({ ok: true });
    expect(posts()[0].body).toMatchObject({ online: false, province: "Santa Fe", city: "Rosario", address: "Urquiza 742" });
  });

  test("programa vinculado existente se recupera sin POST", async () => {
    saveProgress();
    storefronts = [branch()];
    programs = [program()];
    expect(await actions.createPointProgram(programForm())).toMatchObject({ ok: true, data: { programs: [program()] } });
    expect(posts()).toHaveLength(0);
  });

  test("respuesta perdida de programa: retry no duplica y respeta storefrontIds", async () => {
    saveProgress();
    storefronts = [branch()];
    loseProgramResponse = true;
    expect(await actions.createPointProgram(programForm())).toMatchObject({ ok: false });
    expect(await actions.createPointProgram(programForm())).toMatchObject({ ok: true });
    expect(posts("/point-programs")).toHaveLength(1);
    expect(programs).toHaveLength(1);
    expect(posts()[0].body).toEqual({ name: "Beneficios", unitLabel: "puntos", storefrontIds: [SF] });
  });

  test("sucursal ajena o inactiva no permite crear programa", async () => {
    saveProgress();
    storefronts = [branch({ id: OTHER_SF }), branch({ active: false })];
    expect(await actions.createPointProgram(programForm())).toMatchObject({ ok: false });
    expect(posts()).toHaveLength(0);
  });

  test("programa inactivo vinculado no se reemplaza creando otro", async () => {
    saveProgress();
    storefronts = [branch()];
    programs = [program({ active: false })];
    const result = await actions.createPointProgram(programForm());
    expect(result.ok).toBe(false);
    expect(result.error).toContain("inactivo");
    expect(posts()).toHaveLength(0);
  });

  test("error leyendo programas bloquea creación en vez de asumir lista vacía", async () => {
    saveProgress();
    storefronts = [branch()];
    failures.set("GET /point-programs", { status: 503, detail: "No disponible" });
    expect(await actions.createPointProgram(programForm())).toMatchObject({ ok: false, status: 503 });
    expect(posts()).toHaveLength(0);
  });
});

describe("finalización mediante acción de formulario", () => {
  test("propaga redirect a organización sin seleccionar sucursal", async () => {
    saveProgress();
    storefronts = [branch()];
    programs = [program()];
    await expect(actions.finishOnboarding()).rejects.toMatchObject({ path: `/d/${ORG}/mi-negocio` });
    expect(redirect).toHaveBeenCalledTimes(1);
    expect(posts()).toHaveLength(0);
    expect(calls.some(c => c.path === "/auth/storefront")).toBe(false);
  });

  test("sesión vencida devuelve error para el formulario sin redirect", async () => {
    saveProgress();
    adminSession = { status: "expired" };
    expect((await actions.finishOnboarding()).error).toContain("sesión");
    expect(redirect).not.toHaveBeenCalled();
  });

  test("programa sin vínculo a sucursal activa no permite terminar", async () => {
    saveProgress();
    storefronts = [branch()];
    programs = [program({ storefronts: [{ id: OTHER_SF, name: "Otra" }] })];
    expect((await actions.finishOnboarding()).error).toContain("programa de puntos");
    expect(redirect).not.toHaveBeenCalled();
  });
});
