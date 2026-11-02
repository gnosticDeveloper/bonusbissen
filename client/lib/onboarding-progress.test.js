import { describe, expect, test } from "bun:test";
import { completeOnboardingNavigation, createLocalOnboardingProgressStore, orderedOnboardingProgressStore, availableStep, restoreStep, createOnboardingProgressStore, restoreOnboardingNavigation, clampOnboardingStep, minimumStep } from "./onboarding-progress";

const progress = { version: 3, userId: "alice", organizationId: "org", step: 4 };
function fixture() {
  const values = new Map();
  const storage = {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => { values.set(key, value); },
    removeItem: (key) => { values.delete(key); },
  };
  return { values, storage, store: createLocalOnboardingProgressStore(() => storage) };
}

describe("async onboarding persistence", () => {
  test("back navigation and every saved step stay within verified minimum and maximum", () => {
    const base = { userId: "alice", organizationId: "org", storefronts: [] };
    const planned = { id: "org", billingPlanName: "Inicial" };
    const authorized = { ...planned, mercadoPagoSubscriptionStatus: "authorized" };
    const cases = [
      [{ ...base, organization: null }, 0, 0],
      [{ ...base, organization: { id: "org" } }, 1, 1],
      [{ ...base, organization: planned }, 1, 2],
      [{ ...base, organization: authorized }, 3, 3],
      [{ ...base, organization: authorized, storefronts: [{}] }, 4, 4],
      [{ ...base, organization: { id: "org", mercadoPagoSubscriptionStatus: "authorized" }, storefronts: [{}] }, 1, 1],
    ];
    for (const [state, min, max] of cases) {
      expect(minimumStep(state)).toBe(min);
      expect(availableStep(state)).toBe(max);
      for (const requested of [-1, 0, 1, 2, 3, 4, 5]) {
        const expected = Math.max(min, Math.min(requested, max));
        expect(clampOnboardingStep(state, requested)).toBe(expected);
        expect(restoreStep(state, { ...progress, step: requested })).toBe(expected);
      }
      expect(clampOnboardingStep(state, min - 1)).toBe(min);
    }
  });

  test("backend plan name gates checkout and setup, even with authorization and resources", () => {
    const state = { userId: "alice", organizationId: "org", organization: null, storefronts: [{}] };
    expect(availableStep(state)).toBe(0);
    for (const billingPlanName of [undefined, null, ""]) {
      const noPlan = { ...state, organization: { id: "org", billingPlanName, mercadoPagoSubscriptionStatus: "authorized" } };
      expect(availableStep(noPlan)).toBe(1);
      expect(restoreStep(noPlan, progress)).toBe(1);
    }
    const withPlan = { ...state, organization: { id: "org", billingPlanName: "Inicial" } };
    expect(availableStep(withPlan)).toBe(2);
    expect(restoreStep(withPlan, { ...progress, step: 1 })).toBe(1);
    const authorized = { ...withPlan, organization: { ...withPlan.organization, mercadoPagoSubscriptionStatus: "authorized" } };
    expect(availableStep({ ...authorized, storefronts: [] })).toBe(3);
    expect(availableStep(authorized)).toBe(4);
  });

  test("migrates every v2 step to v3 and clears all schema keys", async () => {
    const { store, values } = fixture();
    for (const [previous, migrated] of [[0, 0], [1, 2], [2, 3], [3, 4]]) {
      values.set("onboarding-progress:v2:alice", JSON.stringify({ ...progress, version: 2, step: previous }));
      expect(await store.load("alice")).toEqual({ ...progress, step: migrated });
    }
    values.set("onboarding-progress:v1:alice", JSON.stringify({ ...progress, version: 1, step: 2 }));
    await store.save("alice", { ...progress, step: 0 });
    expect(values.size).toBe(1);
    expect(await store.load("alice")).toEqual({ ...progress, step: 0 });
    values.set("onboarding-progress:v2:alice", "stale");
    values.set("onboarding-progress:v1:alice", "stale");
    await store.clear("alice");
    expect(values.size).toBe(0);
  });

  test("migrates v1 steps and clamps them against authorization, never storage", async () => {
    const { store, values } = fixture();
    const state = { userId: "alice", organizationId: "org", organization: { id: "org" }, storefronts: [{}] };
    for (const [legacy, migrated] of [[0, 0], [1, 3], [2, 4]]) {
      values.set("onboarding-progress:v1:alice", JSON.stringify({ ...progress, version: 1, step: legacy }));
      const saved = await store.load("alice");
      expect(saved).toEqual({ ...progress, step: migrated });
      expect(restoreStep(state, saved)).toBe(1);
    }
    await store.save("alice", progress);
    expect(values.has("onboarding-progress:v1:alice")).toBe(false);
    await store.clear("alice");
    expect(values.size).toBe(0);
  });

  test("payment return advances only with backend authorized, including future invoices", () => {
    const state = { userId: "alice", organizationId: "org", organization: { id: "org" }, storefronts: [] };
    for (const status of [undefined, null, "pending", "paused", "cancelled", "finished", "unknown"]) {
      expect(restoreStep({ ...state, organization: { id: "org", billingPlanName: "Inicial", mercadoPagoSubscriptionStatus: status } }, progress)).toBe(2);
    }
    const authorized = { ...state, organization: { id: "org", billingPlanName: "Inicial", mercadoPagoSubscriptionStatus: "authorized" } };
    for (const step of [1, 2]) {
      expect(restoreStep(authorized, { ...progress, step })).toBe(3);
      expect(restoreStep({ ...authorized, storefronts: [{}] }, { ...progress, step })).toBe(4);
    }
  });
  test("reload and every step change are scoped to the verified user", async () => {
    const { store, storage } = fixture();
    for (const step of [0, 1, 2, 3, 4, 3, 2, 1, 0]) {
      await store.save("alice", { ...progress, step });
      expect(await createLocalOnboardingProgressStore(() => storage).load("alice")).toEqual({ ...progress, step });
    }
    await store.save("bob", { ...progress, userId: "bob" });
    await store.clear("alice");
    expect(await store.load("alice")).toBeNull();
    expect((await store.load("bob"))?.userId).toBe("bob");
  });

  test("only allowlisted fields are persisted and owners cannot be mixed", async () => {
    const { store, values } = fixture();
    await store.save("alice", { ...progress, password: "secret", payment: "secret" });
    expect(JSON.parse([...values.values()][0])).toEqual(progress);
    await expect(store.save("bob", progress)).rejects.toThrow();
  });

  test("corrupt, foreign and unsupported records are ignored", async () => {
    const { store, values } = fixture();
    await store.save("alice", progress);
    const key = [...values.keys()][0];
    for (const value of ["bad-json", "null", JSON.stringify({ ...progress, version: 4 }), JSON.stringify({ ...progress, userId: "bob" }), JSON.stringify({ ...progress, step: 5 }), JSON.stringify({ ...progress, step: 0.5 })]) {
      values.set(key, value);
      expect(await store.load("alice")).toBeNull();
    }
  });

  test("blocked storage rejects operations without pretending progress was saved or cleared", async () => {
    const store = createLocalOnboardingProgressStore(() => { throw new Error("Blocked"); });
    await expect(store.load("alice")).rejects.toThrow("Blocked");
    await expect(store.save("alice", progress)).rejects.toThrow("Blocked");
    await expect(store.clear("alice")).rejects.toThrow("Blocked");
    let navigated = false;
    const failures = [];
    expect(await completeOnboardingNavigation({ error: null, userId: "alice", destination: "/verified" }, store, () => { navigated = true; }, error => failures.push(error.message))).toBe(true);
    expect(failures).toEqual(["Blocked"]);
    expect(navigated).toBe(true);
  });

  test("failed load and save do not poison the queue or block verified completion", async () => {
    const events = [];
    const store = orderedOnboardingProgressStore({
      load: async () => { throw new Error("Blocked read"); },
      save: async () => { throw new Error("Quota exceeded"); },
      clear: async () => { events.push("clear"); },
    });
    await expect(store.load("alice")).rejects.toThrow("Blocked read");
    await expect(store.save("alice", progress)).rejects.toThrow("Quota exceeded");
    await completeOnboardingNavigation({ error: null, userId: "alice", destination: "/verified" }, store, path => events.push(path));
    expect(events).toEqual(["clear", "/verified"]);
  });

  test("delayed save finishes before clear, and clear before navigation", async () => {
    const events = [];
    let release;
    const delay = new Promise(resolve => { release = resolve; });
    const store = orderedOnboardingProgressStore({
      load: async () => null,
      save: async () => { await delay; events.push("save"); },
      clear: async userId => { events.push(`clear:${userId}`); },
    });
    const saving = store.save("alice", progress);
    const finishing = completeOnboardingNavigation({ error: null, userId: "alice", destination: "/verified" }, store, path => { events.push(path); });
    expect(events).toEqual([]);
    release();
    await Promise.all([saving, finishing]);
    expect(events).toEqual(["save", "clear:alice", "/verified"]);
  });

  test("a delayed restoration cannot undo successful branch creation in the same context", async () => {
    let resolveLoad;
    let loads = 0;
    const adapter = {
      load: async () => { loads++; return new Promise(resolve => { resolveLoad = resolve; }); },
      save: async () => {}, clear: async () => {},
    };
    const state = { userId: "alice", organizationId: "org", organization: { id: "org", billingPlanName: "Inicial", mercadoPagoSubscriptionStatus: "authorized" }, storefronts: [] };
    const initial = { state, step: 3, revision: 0 };
    let current = initial;
    const restoring = restoreOnboardingNavigation(adapter, initial, () => current);
    current = { state: { ...state, storefronts: [{ id: "branch" }] }, step: 4, revision: 1 };
    resolveLoad({ ...progress, step: 1 });
    expect(await restoring).toEqual({ step: 4, storageFailed: false });
    expect(loads).toBe(1);
  });

  test("restoration uses latest backend limits and discards a previous user's response", async () => {
    const state = { userId: "alice", organizationId: "org", organization: { id: "org", billingPlanName: "Inicial", mercadoPagoSubscriptionStatus: "authorized" }, storefronts: [{}] };
    const initial = { state, step: 3, revision: 0 };
    let current = initial;
    let resolveLoad;
    const adapter = { load: () => new Promise(resolve => { resolveLoad = resolve; }), save: async () => {}, clear: async () => {} };
    const restoring = restoreOnboardingNavigation(adapter, initial, () => current);
    current = { ...initial, state: { ...state, storefronts: [] } };
    resolveLoad(progress);
    expect(await restoring).toEqual({ step: 3, storageFailed: false });

    for (const changed of [{ ...state, userId: "bob" }, { ...state, organizationId: "another" }]) {
      current = initial;
      const previous = restoreOnboardingNavigation(adapter, initial, () => current);
      current = { ...initial, state: changed };
      resolveLoad(progress);
      expect(await previous).toBeNull();
    }
  });

  test("failed restoration clamps explicit navigation and reports optional storage failure", async () => {
    const state = { userId: "alice", organizationId: "org", organization: { id: "org", billingPlanName: "Inicial", mercadoPagoSubscriptionStatus: "authorized" }, storefronts: [{}] };
    const initial = { state, step: 3, revision: 0 };
    const current = { state, step: 0, revision: 1 };
    const adapter = { load: async () => { throw new Error("Blocked"); }, save: async () => {}, clear: async () => {} };
    expect(await restoreOnboardingNavigation(adapter, initial, () => current)).toEqual({ step: 4, storageFailed: true });
    expect(clampOnboardingStep({ ...state, storefronts: [] }, 2)).toBe(3);
    expect(clampOnboardingStep({ ...state, organization: null }, 2)).toBe(0);
    expect(clampOnboardingStep(state, 0)).toBe(4);
  });

  test("factory accepts an implementation-independent adapter and preserves ordered operations", async () => {
    const events = [];
    const store = createOnboardingProgressStore({
      load: async userId => { events.push(`load:${userId}`); return progress; },
      save: async (userId, saved) => { events.push(`save:${userId}:${saved.step}`); },
      clear: async userId => { events.push(`clear:${userId}`); },
    });
    const operations = [store.load("alice"), store.save("alice", progress), store.clear("alice")];
    expect((await Promise.all(operations))[0]).toEqual(progress);
    expect(events).toEqual(["load:alice", "save:alice:4", "clear:alice"]);
  });

  test("failed backend completion preserves progress and never navigates", async () => {
    const { store } = fixture();
    await store.save("alice", progress);
    expect(await completeOnboardingNavigation({ error: "expired" }, store, () => { throw new Error("Must not navigate"); })).toBe(false);
    expect(await store.load("alice")).toEqual(progress);
  });
});
