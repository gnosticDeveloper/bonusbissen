"use client";

import { useSyncExternalStore } from "react";

let now: number | null = null;
let timer: ReturnType<typeof setInterval> | undefined;
const listeners = new Set<() => void>();

function refresh() {
  now = Date.now();
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  if (timer === undefined) {
    refresh();
    timer = setInterval(refresh, 1000);
    document.addEventListener("visibilitychange", refresh);
  }
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0) {
      clearInterval(timer);
      timer = undefined;
      now = null;
      document.removeEventListener("visibilitychange", refresh);
    }
  };
}

const getSnapshot = () => now;
const getServerSnapshot = () => null;

// All visible countdown badges share one clock, which stops when the last badge unmounts.
export function useCurrentTime() {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
