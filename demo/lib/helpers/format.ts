import { ExchangeState } from "@/lib/demo/types";

/* ---------- formatters ---------- */

const LOCALE = "es-AR";
const TIME_ZONE = "America/Argentina/Buenos_Aires";

const numberFormatter = new Intl.NumberFormat(LOCALE);
const dateFormatter = new Intl.DateTimeFormat(LOCALE, { timeZone: TIME_ZONE });
const dateTimeFormatter = new Intl.DateTimeFormat(LOCALE, {
  timeZone: TIME_ZONE,
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

function formatIso(iso: string, formatter: Intl.DateTimeFormat): string {
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? "Fecha no disponible" : formatter.format(date);
}

export function formatDate(iso: string): string {
  return formatIso(iso, dateFormatter);
}

/** What the backend sends as `formattedCreatedAt`. */
export function formatDateTime(iso: string): string {
  return formatIso(iso, dateTimeFormatter);
}

export function formatNumber(value: number): string {
  return numberFormatter.format(value);
}

/* ---------- billing labels ---------- */

export function subscriptionLabel(status: string | null): string {
  if (status === null) return "Sin suscripción iniciada";
  const labels = new Map([
    ["pending", "Pendiente de autorización"],
    ["authorized", "Cobros autorizados (no confirma un pago)"],
    ["paused", "Suscripción pausada"],
    ["cancelled", "Suscripción cancelada"],
    ["finished", "Suscripción finalizada"],
  ]);
  return labels.get(status) ?? `Estado desconocido (${status})`;
}

export function invoiceLabel(status: string): string {
  return (
    new Map([
      ["paid", "Pagada"],
      ["pending", "Pendiente de pago"],
      ["void", "Anulada"],
    ]).get(status) ?? `Estado desconocido (${status})`
  );
}

export function billingDate(value: string | null): string {
  if (!value) return "Sin fecha informada";
  return formatDate(value);
}

/* ---------- status labels ---------- */

export function redemptionStatusLabel(status: ExchangeState): string {
  switch (status) {
    case ExchangeState.PENDING:
      return "Pendiente";
    case ExchangeState.COMPLETED:
      return "Entregado";
    case ExchangeState.CANCELLED:
      return "Anulado";
  }
}

export type PointActionType = "add" | "subtract" | "edit";

export function pointActionLabel(type: PointActionType): string {
  switch (type) {
    case "add":
      return "Suma de puntos";
    case "subtract":
      return "Resta de puntos";
    case "edit":
      return "Corrección de puntos";
  }
}
