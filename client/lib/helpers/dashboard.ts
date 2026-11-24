/* ---------- dashboard home ("Inicio") ---------- */

const MINUTE_MS = 60_000;
const HOUR_MS = 60 * MINUTE_MS;
const DAY_MS = 24 * HOUR_MS;

/** A pending redemption waiting longer than this is highlighted on the dashboard home. */
export const OVERDUE_AFTER_DAYS = 7;

const relativeTimeFormatter = new Intl.RelativeTimeFormat("es-AR", { numeric: "always" });

/**
 * How long ago `iso` was, relative to `now` (ms): "hace 5 minutos", "hace 3 horas", "hace 9 días".
 * Elapsed time, not calendar days. Never less than a minute, so a just-made claim doesn't read
 * "hace 0 minutos" (or "dentro de…" when the server clock is slightly ahead). `null` for an
 * unreadable date.
 */
export function timeAgo(iso: string, now: number): string | null {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return null;

  const elapsed = Math.max(now - then, MINUTE_MS);
  if (elapsed < HOUR_MS) return relativeTimeFormatter.format(-Math.floor(elapsed / MINUTE_MS), "minute");
  if (elapsed < DAY_MS) return relativeTimeFormatter.format(-Math.floor(elapsed / HOUR_MS), "hour");
  return relativeTimeFormatter.format(-Math.floor(elapsed / DAY_MS), "day");
}

/** Whether `iso` is more than {@link OVERDUE_AFTER_DAYS} days before `now` (ms). False for an unreadable date. */
export function isOverdue(iso: string, now: number): boolean {
  const then = new Date(iso).getTime();
  return !Number.isNaN(then) && now - then > OVERDUE_AFTER_DAYS * DAY_MS;
}

/**
 * Whole-percent change from `previous` to `current`, or `null` when there's nothing to compare
 * against (`previous` is 0 or negative), since a percentage of zero is meaningless.
 */
export function percentChange(current: number, previous: number): number | null {
  if (previous <= 0) return null;
  return Math.round(((current - previous) / previous) * 100);
}
