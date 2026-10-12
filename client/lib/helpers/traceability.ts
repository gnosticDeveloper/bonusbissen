import type { AuditFilters, AuditRecord, TransactionSummary } from "../types/traceability";

export function auditQuery(filters: AuditFilters): string {
  const params = new URLSearchParams();
  if (filters.originatingUserId) params.set("originatingUserId", filters.originatingUserId);
  if (filters.affectedUserId) params.set("affectedUserId", filters.affectedUserId);
  if (filters.operationType) params.set("operationType", filters.operationType);
  return params.toString();
}

const points = (value: number) => new Intl.NumberFormat("es-AR").format(value);
const signedPoints = (value: number) => `${value > 0 ? "+" : ""}${points(value)} puntos`;

function transactionContext(transaction: TransactionSummary | null): string[] {
  if (!transaction) return [];
  return [
    transaction.reward && `Recompensa: ${transaction.reward.title ?? "Nombre no disponible"}`,
    transaction.program && `Programa: ${transaction.program.name ?? "Nombre no disponible"}`,
    transaction.storefront && `Sucursal: ${transaction.storefront.name ?? "Nombre no disponible"}`,
  ].filter((line): line is string => Boolean(line));
}

export function auditDetailLines(record: AuditRecord): string[] {
  switch (record.operationType) {
    case "SESSION_REVOKE":
      return ["Se revocaron todas las sesiones del usuario afectado."];
    case "STAFF_CREATE": {
      const { role, organization, storefront } = record.details;
      return [
        `Se incorporó al usuario al personal como ${role === "ADMIN" ? "administrador" : role === "CASHIER" ? "cajero" : "rol no disponible"}.`,
        ...(organization ? [`Organización: ${organization.name ?? "Nombre no disponible"}`] : []),
        ...(storefront ? [`Sucursal: ${storefront.name ?? "Nombre no disponible"}`] : []),
      ];
    }
    case "USER_CREATE":
      return [`Se creó la cuenta ${record.details.username ?? "(usuario no disponible)"}.`];
    case "POINTS_GRANT": {
      const { points: amount, program, storefront, note } = record.details;
      return [
        `Movimiento: ${signedPoints(amount)}.`,
        ...(program ? [`Programa: ${program.name ?? "Nombre no disponible"}`] : []),
        ...(storefront ? [`Sucursal: ${storefront.name ?? "Nombre no disponible"}`] : []),
        ...(note ? [`Nota: ${note}`] : []),
      ];
    }
    case "POINTS_CORRECTION":
      return [
        `Ajuste sobre el movimiento original: ${signedPoints(record.details.points)} (no es el saldo final).`,
        ...transactionContext(record.details.transaction),
        ...(record.details.note ? [`Motivo: ${record.details.note}`] : []),
      ];
    case "REWARD_CLAIM":
      return [
        `Se solicitó la recompensa «${record.details.reward?.title ?? "Nombre no disponible"}».`,
        `Costo descontado: ${points(record.details.costPoints)} puntos. Pendiente de entrega.`,
        ...(record.details.program ? [`Programa: ${record.details.program.name ?? "Nombre no disponible"}`] : []),
      ];
    case "EXCHANGE_VERIFY":
      return [
        "Se verificó el código; esto no confirma la entrega ni modifica los puntos.",
        ...(record.details.code ? [`Código: ${record.details.code}`] : []),
        ...transactionContext(record.details.transaction),
      ];
    case "EXCHANGE_APPROVE":
      return [
        `Se confirmó la entrega de un canje de ${points(record.details.points)} puntos. No se sumaron puntos.`,
        ...transactionContext(record.details.transaction),
      ];
    case "EXCHANGE_CANCEL":
      return [
        "El personal canceló el canje.",
        record.details.refunded ? `Se devolvieron ${points(record.details.points)} puntos.` : `Sin devolución de puntos. Costo del canje: ${points(record.details.points)} puntos.`,
        ...transactionContext(record.details.transaction),
      ];
    case "EXCHANGE_USER_CANCEL":
      return [
        `El cliente canceló el canje y se le devolvieron ${points(record.details.points)} puntos.`,
        ...transactionContext(record.details.transaction),
      ];
  }
}

export function auditReferences(record: AuditRecord): { label: string; id: string }[] {
  const references = [{ label: "Operación", id: record.operationId }];
  if ("transaction" in record.details && record.details.transaction) {
    references.push({ label: record.operationType === "POINTS_CORRECTION" ? "Movimiento de corrección" : "Movimiento", id: record.details.transaction.id });
  }
  if (record.operationType === "POINTS_CORRECTION" && record.details.correctedTransaction) {
    references.push({ label: "Movimiento original", id: record.details.correctedTransaction.id });
  }
  return references;
}

export function sortAuditRecords(records: AuditRecord[]): AuditRecord[] {
  return [...records].sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt) || b.operationId.localeCompare(a.operationId));
}
