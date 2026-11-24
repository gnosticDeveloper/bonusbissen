"use client";

import { useSyncExternalStore } from "react";
import { createSeed, DEMO_VERSION } from "./seed";
import type { DemoState, Transaction } from "./types";

/**
 * The whole demo lives in one sessionStorage entry: closing the tab resets it.
 * Reads go through a cached snapshot so `useSyncExternalStore` gets a stable reference.
 */
const STORAGE_KEY = "bb_demo_state";

let snapshot: DemoState | null = null;
const listeners = new Set<() => void>();

function read(): DemoState {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as DemoState;
      if (parsed.version === DEMO_VERSION) return parsed;
    }
  } catch {
    // Corrupt or unavailable storage: start from the seed.
  }
  const seed = createSeed();
  persist(seed);
  return seed;
}

function persist(state: DemoState): boolean {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    return true;
  } catch {
    // Quota exceeded (usually big images): keep working in memory for this page.
    return false;
  }
}

export function getState(): DemoState {
  if (!snapshot) snapshot = processExpirations(read());
  return snapshot;
}

/** Applies `recipe` to a copy of the state, persists it and notifies subscribers. */
export function updateState(recipe: (draft: DemoState) => void): { persisted: boolean } {
  const draft = structuredClone(getState());
  recipe(draft);
  snapshot = processExpirations(draft);
  const persisted = persist(snapshot);
  listeners.forEach((listener) => listener());
  return { persisted };
}

export function resetDemo() {
  snapshot = createSeed();
  persist(snapshot);
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  const onStorage = (event: StorageEvent) => {
    if (event.key === STORAGE_KEY) {
      snapshot = null;
      listener();
    }
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

/** `null` during prerender and the first hydration pass: pages show their loading state then. */
export function useDemoState(): DemoState | null {
  return useSyncExternalStore(subscribe, getState, () => null);
}

/* ---------- ledger helpers ---------- */

/** Grants whose deadline passed get a matching `expire` movement, once. */
function processExpirations(state: DemoState): DemoState {
  const now = Date.now();
  const expired = new Set(state.transactions.filter((t) => t.kind === "expire" && t.correctsId).map((t) => t.correctsId!));
  const additions: Transaction[] = [];

  for (const tx of state.transactions) {
    if (tx.kind !== "grant" || !tx.expiresAt || expired.has(tx.id) || Date.parse(tx.expiresAt) > now) continue;
    // Never expire more than the remaining balance: spent points are not taken back.
    const remaining = balanceOf(state, tx.userId, tx.programId) + additions.filter((a) => a.userId === tx.userId && a.programId === tx.programId).reduce((sum, a) => sum + a.points, 0);
    const amount = Math.min(effectiveAmount(state, tx), remaining);
    if (amount <= 0) continue;
    additions.push({
      id: `tx-exp-${tx.id}`,
      userId: tx.userId,
      programId: tx.programId,
      storefrontId: tx.storefrontId,
      kind: "expire",
      points: -amount,
      note: null,
      byStaffId: null,
      createdAt: tx.expiresAt,
      expiresAt: tx.expiresAt,
      correctsId: tx.id,
    });
  }

  if (additions.length === 0) return state;
  return { ...state, transactions: [...state.transactions, ...additions] };
}

export function effectiveAmount(state: DemoState, grant: Transaction): number {
  return state.transactions.filter((t) => t.kind === "correction" && t.correctsId === grant.id).reduce((sum, t) => sum + t.points, grant.points);
}

export function balanceOf(state: DemoState, userId: string, programId: string): number {
  return state.transactions.filter((t) => t.userId === userId && t.programId === programId).reduce((sum, t) => sum + t.points, 0);
}

export function programOfStorefront(state: DemoState, storefrontId: string) {
  return state.programs.find((p) => p.storefrontIds.includes(storefrontId)) ?? null;
}

export function isMemberOfStorefront(state: DemoState, userId: string, storefrontId: string): boolean {
  return state.affiliations.some((a) => a.userId === userId && a.storefrontId === storefrontId);
}

export function managedOrg(state: DemoState) {
  return state.organizations.find((o) => o.managed)!;
}

export function orgOf(state: DemoState, orgId: string) {
  return state.organizations.find((o) => o.id === orgId) ?? null;
}

export function currentCustomer(state: DemoState) {
  const id = state.session.customerId;
  return id ? (state.customers.find((c) => c.id === id) ?? null) : null;
}

export function currentStaff(state: DemoState) {
  const session = state.session.staff;
  if (!session) return null;
  const member = state.staff.find((s) => s.id === session.staffId && s.active);
  return member ? { member, storefrontId: session.storefrontId } : null;
}
