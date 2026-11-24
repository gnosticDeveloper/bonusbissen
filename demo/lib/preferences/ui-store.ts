"use client";

import { useSyncExternalStore } from "react";

/** Side menu open state, shared by the bottom nav and the menu itself (zustand in the main app). */
let menuOpen = false;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((listener) => listener());

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

export const openMenu = () => {
  menuOpen = true;
  emit();
};
export const closeMenu = () => {
  if (!menuOpen) return;
  menuOpen = false;
  emit();
};

export function useMenuOpen() {
  return useSyncExternalStore(subscribe, () => menuOpen, () => false);
}
