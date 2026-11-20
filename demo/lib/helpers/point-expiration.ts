export type PointExpirationData = {
  expirationApplicable: boolean;
  expiresAt: string | null;
  expired?: boolean;
};

export type ExpirationSeverity = "none" | "normal" | "warning" | "urgent" | "critical" | "expired";

export type PointExpirationStatus = {
  label: string;
  severity: ExpirationSeverity;
  deadline: string | null;
  formattedDeadline: string | null;
};

const DAY_MS = 24 * 60 * 60 * 1000;
const deadlineFormatter = new Intl.DateTimeFormat("es-AR", {
  timeZone: "America/Argentina/Buenos_Aires",
  calendar: "gregory",
  numberingSystem: "latn",
  hourCycle: "h23",
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

function formatDeadline(timestamp: number): string {
  // ICU locale defaults and literals can differ between the server and browser.
  const parts = Object.fromEntries(deadlineFormatter.formatToParts(timestamp).map(({ type, value }) => [type, value]));
  return `${parts.day}/${parts.month}/${parts.year}, ${parts.hour}:${parts.minute}`;
}

export function pointExpirationStatus(data: PointExpirationData, now: number | null): PointExpirationStatus | null {
  if (!data.expirationApplicable) return null;

  // Require an explicit offset: never interpret a backend deadline in the browser's local timezone.
  const timestamp = data.expiresAt && /T.*(?:Z|[+-]\d{2}:\d{2})$/.test(data.expiresAt)
    ? Date.parse(data.expiresAt)
    : NaN;
  const validDeadline = Number.isFinite(timestamp);
  const deadline = validDeadline ? data.expiresAt : null;
  const formattedDeadline = validDeadline ? formatDeadline(timestamp) : null;

  if (data.expired || (validDeadline && now !== null && timestamp <= now)) {
    return { label: "Puntos expirados", severity: "expired", deadline, formattedDeadline };
  }
  if (data.expiresAt === null) {
    return { label: "Sin vencimiento", severity: "none", deadline: null, formattedDeadline: null };
  }
  if (!validDeadline) return null;

  // The server and first hydration render share an absolute-date fallback, avoiding clock mismatches.
  if (now === null) return { label: "Con vencimiento", severity: "normal", deadline, formattedDeadline };

  const remaining = timestamp - now;
  if (remaining < DAY_MS) {
    return { label: "Expira en menos de 24 horas", severity: "critical", deadline, formattedDeadline };
  }

  const days = Math.floor(remaining / DAY_MS);
  return {
    label: days === 1 ? "Expira en 1 día" : `Expira en ${days} días`,
    severity: remaining <= 7 * DAY_MS ? "urgent" : remaining <= 30 * DAY_MS ? "warning" : "normal",
    deadline,
    formattedDeadline,
  };
}
