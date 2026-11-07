import { PointActionType } from "@/app/d/types";
import { ExchangeState } from "../types/exchange";

const numberFormatter = new Intl.NumberFormat("es-AR");

export function formatDateTime(iso: string): string {
  const date = new Date(iso);

  return Number.isNaN(date.getTime()) ? "Fecha no disponible" : date.toLocaleDateString("es-AR", { timeZone: "America/Argentina/Buenos_Aires" });
}

export function formatNumber(value: number): string {
  return numberFormatter.format(value);
}

export function formatMoney(amount: number, currency: string): string {
  try {
    return new Intl.NumberFormat("es-AR", { style: "currency", currency }).format(amount);
  } catch {
    return `${amount.toLocaleString("es-AR")} ${currency}`;
  }
}

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
  return formatDateTime(value);
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
