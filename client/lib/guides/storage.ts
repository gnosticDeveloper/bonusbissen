import { setPreferenceCookie } from "@/lib/preferences/cookie";

/**
 * Which tour steps and tips this device has already shown, kept in two cookies as comma-separated
 * `<view>.<id>` keys. Tracking each step (not each tour) is what lets a tour grow: a step added
 * later is simply a key nobody has yet.
 *
 * Per device by design: clearing site data or using another device shows the guides again. These
 * cookies only decide what help to show; they are never read as access control.
 */
export const GUIDE_COOKIES = {
  steps: "bb_guide_steps",
  tips: "bb_guide_tips",
} as const;

export type GuideKind = keyof typeof GUIDE_COOKIES;

const KEY = /^[a-z0-9-]+\.[a-z0-9-]+$/;

export function guideKey(viewId: string, itemId: string): string {
  return `${viewId}.${itemId}`;
}

/** Reads a raw cookie value; anything malformed is dropped rather than trusted. */
export function parseSeen(raw: string | null | undefined): Set<string> {
  if (!raw) return new Set();
  let decoded: string;
  try {
    decoded = decodeURIComponent(raw);
  } catch {
    return new Set();
  }
  return new Set(decoded.split(",").filter((key) => KEY.test(key)));
}

export function serializeSeen(seen: Iterable<string>): string {
  return [...new Set(seen)].filter((key) => KEY.test(key)).sort().join(",");
}

function readCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return match ? match[1] : null;
}

const listeners = new Set<() => void>();

function emit() {
  for (const listener of listeners) listener();
}

/** For `useSyncExternalStore`: notifies when this tab changes what was seen. */
export function subscribeSeen(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** A primitive snapshot of both cookies, stable while they don't change. */
export function seenSnapshot(): string {
  return `${readCookie(GUIDE_COOKIES.steps) ?? ""}|${readCookie(GUIDE_COOKIES.tips) ?? ""}`;
}

export function readSeen(kind: GuideKind): Set<string> {
  return parseSeen(readCookie(GUIDE_COOKIES[kind]));
}

export function markSeen(kind: GuideKind, keys: string[]): void {
  const seen = readSeen(kind);
  const before = seen.size;
  for (const key of keys) seen.add(key);
  if (seen.size === before) return;
  setPreferenceCookie(GUIDE_COOKIES[kind], encodeURIComponent(serializeSeen(seen)));
  emit();
}

/** Forgets every tour step and tip, so they all show again on this device. */
export function resetSeen(): void {
  for (const name of Object.values(GUIDE_COOKIES)) {
    document.cookie = `${name}=; path=/; max-age=0; SameSite=Lax`;
  }
  emit();
}
