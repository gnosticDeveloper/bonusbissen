"use client";

import { useSyncExternalStore } from "react";

/**
 * Seen guided tours, stored in a cookie (`bb_demo_tours`) so each page's tour
 * shows only the first time. Resetting the demo clears it.
 */
const COOKIE = "bb_demo_tours";

function readSeen(): Set<string> {
  if (typeof document === "undefined") return new Set();
  const match = document.cookie.match(new RegExp(`(?:^|; )${COOKIE}=([^;]*)`));
  if (!match) return new Set();
  return new Set(decodeURIComponent(match[1]).split(",").filter(Boolean));
}

function writeSeen(seen: Set<string>) {
  document.cookie = `${COOKIE}=${encodeURIComponent([...seen].join(","))}; path=/; max-age=31536000; SameSite=Lax`;
}

export function hasSeenTour(id: string): boolean {
  return readSeen().has(id);
}

export function markTourSeen(id: string) {
  const seen = readSeen();
  if (seen.has(id)) return;
  seen.add(id);
  writeSeen(seen);
}

export function resetTours() {
  document.cookie = `${COOKIE}=; path=/; max-age=0; SameSite=Lax`;
}

/* ---------- "show this page's guide again" (used by the demo menu) ---------- */

let replay: (() => void) | null = null;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((listener) => listener());

export function registerTourReplay(fn: () => void) {
  replay = fn;
  emit();
  return () => {
    if (replay === fn) {
      replay = null;
      emit();
    }
  };
}

export function replayCurrentTour() {
  replay?.();
}

export function useHasTour() {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    () => replay !== null,
    () => false,
  );
}
