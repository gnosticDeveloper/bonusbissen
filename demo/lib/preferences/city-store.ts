"use client";

import { useSyncExternalStore } from "react";

/** Preferred city, remembered on this device like the main app (localStorage `bb-selected-city`). */
const KEY = "bb-selected-city";
const listeners = new Set<() => void>();

function read(): string | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { state?: { selectedCity?: string | null } };
    return parsed.state?.selectedCity ?? null;
  } catch {
    return null;
  }
}

let cached: string | null | undefined;
const getSnapshot = () => (cached === undefined ? (cached = read()) : cached);

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useSelectedCity() {
  return useSyncExternalStore(subscribe, getSnapshot, () => null);
}

export function useUpdateSelectedCity() {
  return (city: string | null) => {
    cached = city;
    try {
      localStorage.setItem(KEY, JSON.stringify({ state: { selectedCity: city }, version: 0 }));
    } catch {
      // Private mode: keep it in memory.
    }
    listeners.forEach((listener) => listener());
  };
}
