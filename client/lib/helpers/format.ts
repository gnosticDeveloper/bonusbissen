import { PointActionType } from "@/lib/types/dashboard";
import { ExchangeState } from "../types/exchange";

/* ---------- formatters ---------- */

// Building an Intl formatter is far slower than using one, so each is created
// once and reused. Locale and time zone are fixed, so server and client render
// the same text.
const LOCALE = "es-AR";
const TIME_ZONE = "America/Argentina/Buenos_Aires";

const numberFormatter = new Intl.NumberFormat(LOCALE);
const dateFormatter = new Intl.DateTimeFormat(LOCALE, { timeZone: TIME_ZONE });
const dateTimeFormatter = new Intl.DateTimeFormat(LOCALE, {
  timeZone: TIME_ZONE,
  year: "numeric",
  month: "numeric",
  day: "numeric",
  hour: "numeric",
  minute: "numeric",
  second: "numeric",
});

// Money needs one formatter per currency. Currencies come from backend data,
// so the cache is capped: when it's full, the oldest entry is dropped (a Map
// keeps insertion order). In practice only ARS and maybe USD ever show up.
const MAX_MONEY_FORMATTERS = 10;
const moneyFormatters = new Map<string, Intl.NumberFormat>();

function moneyFormatter(currency: string): Intl.NumberFormat {
  let formatter = moneyFormatters.get(currency);
  if (formatter) return formatter;

  // Throws a RangeError for an invalid currency code; nothing gets cached then.
  formatter = new Intl.NumberFormat(LOCALE, { style: "currency", currency });
  if (moneyFormatters.size >= MAX_MONEY_FORMATTERS) {
    const oldest = moneyFormatters.keys().next().value;
    if (oldest !== undefined) moneyFormatters.delete(oldest);
  }
  moneyFormatters.set(currency, formatter);
  return formatter;
}

/** Formats with `formatter`, or returns a fallback when `iso` isn't a valid date. */
function formatIso(iso: string, formatter: Intl.DateTimeFormat): string {
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? "Fecha no disponible" : formatter.format(date);
}

export function formatDate(iso: string): string {
  return formatIso(iso, dateFormatter);
}

export function formatNumber(value: number): string {
  return numberFormatter.format(value);
}

export function formatMoney(amount: number, currency: string): string {
  try {
    return moneyFormatter(currency).format(amount);
  } catch {
    return `${formatNumber(amount)} ${currency}`;
  }
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
