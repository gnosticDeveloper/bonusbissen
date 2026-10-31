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
  delete: name => jar.delete(name),
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
    if (path === "/auth/logout") return new Response(null, { status: 204 });
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
  organization = { id: ORG, name: "Café", billingPlanName: "Inicial", mercadoPagoSubscriptionStatus: "authorized" };
  storefronts = [];
  programs = [];
  failures = new Map();
  loseStorefrontResponse = false;
  loseProgramResponse = false;
});
afterAll(() => { globalThis.fetch = originalFetch; });

describe("organización y reingreso", () => {
  test("logout root revoca ambas sesiones y expira hint sin borrar recursos", async () => {
    saveProgress();
    jar.set("bb_user_rt", "customer-refresh");
    jar.set("bb_dashboard_rt", "admin-refresh");
    jar.set("d_storefronts", "branches");
    storefronts = [branch()];
    programs = [program()];
    await actions.leaveOnboarding();
    expect(calls.filter(call => call.path === "/auth/logout").map(call => call.authorization).sort()).toEqual(["Bearer customer-token", "Bearer dashboard-token"]);
    for (const name of ["access_token", "bb_user_rt", "d_token", "bb_dashboard_rt", "d_storefronts"]) expect(jar.has(name)).toBe(false);
    expect(setCookie).toHaveBeenCalledWith(PROGRESS, "", expect.objectContaining({ path: "/onboarding", maxAge: 0 }));
    expect(storefronts).toHaveLength(1);
    expect(programs).toHaveLength(1);
  });
  test("primer ingreso sin cookies ni sesiones no muestra error ni consulta backend", async () => {
    jar.clear();
    customerSession = { status: "invalid" };
    adminSession = { status: "invalid" };
    expect(await state.loadOnboarding()).toEqual({ userId: null, customer: false, organizationId: null, organization: null, storefronts: [], programs: [] });
    expect(calls).toHaveLength(0);
  });

  test("cuenta nueva sin login admin puede iniciar el alta sin error", async () => {
    jar.delete("d_token");
    adminSession = { status: "invalid" };
    const initial = await state.loadOnboarding();
    expect(initial).toMatchObject({ userId: OWNER, customer: true, organizationId: null, organization: null });
    expect(initial.error).toBeUndefined();
    expect(calls.map(c => c.path)).toEqual(["/users/me"]);
  });

  test("organización pendiente espera login admin sin presentarlo como sesión vencida", async () => {
    saveProgress();
    jar.delete("d_token");
    adminSession = { status: "invalid" };
    const pending = await state.loadOnboarding();
    expect(pending).toMatchObject({ userId: OWNER, organizationId: ORG, organization: null });
    expect(pending.error).toBeUndefined();
    expect(calls.map(c => c.path)).toEqual(["/users/me"]);
  });

  test.each(["expired", "unavailable"])("sesión admin realmente %s informa reingreso o reintento", async status => {
    saveProgress();
    adminSession = { status };
    const pending = await state.loadOnboarding();
    expect(pending.organizationId).toBe(ORG);
    expect(pending.error).toContain(status === "expired" ? "venció" : "verificar");
    expect(calls.map(c => c.path)).toEqual(["/users/me"]);
  });
  test("crear, fallar login, recargar y reintentar no vuelve a crear ni guarda contraseñas", async () => {
    adminSession = { status: "invalid" };
    const created = await actions.createOrganization(form({ name: "  Café  " }));
    expect(created.ok).toBe(true);
    expect(created.data.error).toBeUndefined();
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

  test("cookie ajena no bloquea el alta y sólo se reemplaza por el negocio confirmado", async () => {
    saveProgress(OTHER_OWNER, OTHER_ORG);
    adminSession = { status: "invalid" };
    const initial = await state.loadOnboarding();
    expect(initial.organizationId).toBeNull();
    expect(initial.error).toBeUndefined();
    const created = await actions.createOrganization(form({ name: "Nuevo" }));
    expect(created).toMatchObject({ ok: true, data: { userId: OWNER, organizationId: ORG, organization: null } });
    expect(created.data.error).toBeUndefined();
    expect(posts("/organizations")).toHaveLength(1);
    expect(JSON.parse(jar.get(PROGRESS))).toEqual({ owner: OWNER, organizationId: ORG });
    expect(calls.some(c => c.path === "/organization")).toBe(false);
  });

  test("alta rechazada conserva hint ajeno sin exponerlo a la cuenta actual", async () => {
    saveProgress(OTHER_OWNER, OTHER_ORG);
    adminSession = { status: "invalid" };
    const saved = jar.get(PROGRESS);
    failures.set("POST /organizations", { status: 409, detail: "Ya tiene un negocio" });
    expect(await actions.createOrganization(form({ name: "Nuevo" }))).toMatchObject({ ok: false, error: "Ya tiene un negocio" });
    expect(jar.get(PROGRESS)).toBe(saved);
    expect(setCookie).not.toHaveBeenCalled();
    expect((await state.loadOnboarding()).organizationId).toBeNull();
  });

  test("retomar con cookie ajena usa selección explícita y backend antes de cambiar owner", async () => {
    saveProgress(OTHER_OWNER, OTHER_ORG);
    adminSession = { status: "invalid" };
    const credentials = loginForm();
    credentials.set("organizationId", ORG);
    expect(await actions.authenticateAdmin(credentials)).toMatchObject({ ok: true, data: { userId: OWNER, organizationId: ORG, organization } });
    expect(dashboardSignIn.mock.calls[0][0].get("organizationId")).toBe(ORG);
    expect(JSON.parse(jar.get(PROGRESS))).toEqual({ owner: OWNER, organizationId: ORG });
    expect(posts()).toHaveLength(0);
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
  test("owner ajeno nunca expone la organización ni permite mutaciones", async () => {
    saveProgress(OTHER_OWNER);
    expect(await state.loadOnboarding()).toMatchObject({ userId: OWNER, organizationId: null, organization: null, storefronts: [], programs: [] });
    expect(await actions.createStorefront(branchForm())).toMatchObject({ ok: false });
    expect(posts()).toHaveLength(0);
  });

  test("sesiones de usuarios distintos requieren reingreso", async () => {
    adminSession = valid("ADMIN", OTHER_OWNER);
    expect(await state.loadOnboarding()).toMatchObject({ userId: OWNER, organization: null });
    expect(await actions.authenticateAdmin(loginForm())).toMatchObject({ ok: false });
  });

  test("sesiones vencidas no proporcionan identidad ni progreso de otro usuario", async () => {
    saveProgress();
    customerSession = { status: "expired" };
    adminSession = { status: "expired" };
    expect(await state.loadOnboarding()).toMatchObject({ userId: null, customer: false, organizationId: null, organization: null });
    expect(calls).toHaveLength(0);
  });

  test("sin cookie recupera organización desde backend y la identidad admin verificada", async () => {
    customerSession = { status: "expired" };
    expect(await state.loadOnboarding()).toMatchObject({ userId: OWNER, customer: false, organizationId: ORG, organization });
  });

  test("rechazo backend de customer no expone identidad de persistencia", async () => {
    failures.set("GET /users/me", { status: 401, detail: "Sesión revocada" });
    expect(await state.loadOnboarding()).toMatchObject({ userId: null, organization: null });
  });
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

  test.each(["no-json", JSON.stringify({ organizationId: "invalid", owner: OWNER })])("cookie malformada se ignora; sesión y backend autorizan (%s)", async value => {
    jar.set(PROGRESS, value);
    expect(await state.readProgress()).toBeNull();
    expect(await state.adminOrganization()).toMatchObject({ ok: true, data: organization });
    expect(await state.loadOnboarding()).toMatchObject({ userId: OWNER, organizationId: ORG, organization });
    adminSession = { status: "expired" };
    expect(await state.adminOrganization()).toMatchObject({ ok: false });
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
  test.each([undefined, null, ""])("plan backend %s bloquea setup y cierre incluso autorizado", async billingPlanName => {
    organization.billingPlanName = billingPlanName;
    storefronts = [branch()];
    programs = [program()];
    saveProgress();
    expect((await actions.createStorefront(branchForm())).error).toContain("Elegí un plan");
    expect((await actions.createPointProgram(programForm())).error).toContain("Elegí un plan");
    expect((await actions.finishOnboarding()).error).toContain("Elegí un plan");
    expect(jar.has(PROGRESS)).toBe(true);
    expect(posts()).toHaveLength(0);
    expect(calls.some(call => /checkout|invoices/.test(call.path))).toBe(false);
    expect((await state.loadOnboarding()).organization.billingPlanName).toBe(billingPlanName);
  });

  test("plan se verifica de nuevo en backend antes de cada operación", async () => {
    organization.billingPlanName = null;
    expect((await actions.createStorefront(branchForm())).ok).toBe(false);
    organization.billingPlanName = "Inicial";
    expect((await actions.createStorefront(branchForm())).ok).toBe(true);
    organization.billingPlanName = null;
    expect((await actions.createPointProgram(programForm())).ok).toBe(false);
    expect(posts("/point-programs")).toHaveLength(0);
  });
  test.each([undefined, null, "pending", "paused", "cancelled", "finished", "unknown"])("suscripción %s bloquea el resto del recorrido incluso con recursos existentes", async status => {
    organization.mercadoPagoSubscriptionStatus = status;
    storefronts = [branch()];
    programs = [program()];
    saveProgress();
    expect((await actions.createStorefront(branchForm())).ok).toBe(false);
    expect((await actions.createPointProgram(programForm())).ok).toBe(false);
    expect((await actions.finishOnboarding()).error).toContain("Autorizá");
    expect(jar.has(PROGRESS)).toBe(true);
    expect(calls.every(call => call.method === "GET")).toBe(true);
  });

  test("autorización recién confirmada permite setup sin consultar facturas; revocación lo bloquea", async () => {
    organization.mercadoPagoSubscriptionStatus = "pending";
    expect((await actions.createStorefront(branchForm())).ok).toBe(false);
    organization.mercadoPagoSubscriptionStatus = "authorized";
    expect((await actions.createStorefront(branchForm())).ok).toBe(true);
    organization.mercadoPagoSubscriptionStatus = "cancelled";
    expect((await actions.createPointProgram(programForm())).ok).toBe(false);
    expect(calls.some(call => call.path.includes("invoices"))).toBe(false);
  });
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
  test("devuelve destino verificado y limpia hint sin redirect ni seleccionar sucursal", async () => {
    saveProgress();
    storefronts = [branch()];
    programs = [program()];
    expect(await actions.finishOnboarding()).toEqual({ error: null, userId: OWNER, destination: `/d/${ORG}/mi-negocio` });
    expect(setCookie).toHaveBeenLastCalledWith(PROGRESS, "", expect.objectContaining({ maxAge: 0, path: "/onboarding" }));
    expect(redirect).not.toHaveBeenCalled();
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
