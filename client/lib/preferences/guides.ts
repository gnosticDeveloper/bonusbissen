import { setPreferenceCookie } from "./cookie";

/**
 * Whether this device shows the dashboard guides (tours and tips) on its own. One flag for every
 * guide, so guides added in later versions stay off too. Turning them off doesn't mark anything as
 * seen: turning them back on picks up where the user left off. A guide replayed from Ayuda still
 * shows, since the user asked for it.
 *
 * Only decides what help to show; never access control.
 */
export const GUIDES_COOKIE_NAME = "bb_guides";

const OFF = "off";
const ON = "on";

/** Interprets the raw cookie value; anything but "off" means guides are on. */
export function guidesEnabledFrom(value: string | null | undefined): boolean {
  return value !== OFF;
}

/** Reads the preference in the browser. */
export function readGuidesEnabled(): boolean {
  const match = document.cookie.match(new RegExp(`(?:^|; )${GUIDES_COOKIE_NAME}=([^;]*)`));
  return guidesEnabledFrom(match?.[1]);
}

export function persistGuidesEnabled(enabled: boolean): void {
  setPreferenceCookie(GUIDES_COOKIE_NAME, enabled ? ON : OFF);
}
