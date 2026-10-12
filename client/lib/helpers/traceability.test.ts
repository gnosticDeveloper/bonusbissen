import assert from "node:assert/strict";
import { test } from "node:test";
import { auditDetailLines, auditQuery, auditReferences, sortAuditRecords } from "./traceability";
import type { AuditRecord } from "../types/traceability";

const base = {
  operationId: "operation-1",
  originatingUser: { id: "staff-1", name: "Ana", username: "ana@example.com" },
  affectedUsers: [{ id: "customer-1", name: "Juan", username: "juan@example.com" }],
  createdAt: "2026-10-12T14:00:00Z",
};

test("query omits empty filters and preserves all three AND parameters", () => {
  assert.equal(auditQuery({}), "");
  const query = new URLSearchParams(auditQuery({ originatingUserId: "staff-1", affectedUserId: "customer-1", operationType: "POINTS_CORRECTION" }));
  assert.equal(query.get("originatingUserId"), "staff-1");
  assert.equal(query.get("affectedUserId"), "customer-1");
  assert.equal(query.get("operationType"), "POINTS_CORRECTION");
  assert.equal(query.size, 3);
});

test("grants retain signed point amounts and notes", () => {
  const details = { points: -1250, note: "Ajuste de caja", program: null, storefront: null };
  const record: AuditRecord = { ...base, operationType: "POINTS_GRANT", details };
  assert.match(auditDetailLines(record)[0], /-1\.250 puntos/);
  assert.ok(auditDetailLines(record).includes("Nota: Ajuste de caja"));
  assert.match(auditDetailLines({ ...record, details: { ...details, points: 25 } })[0], /\+25 puntos/);
});

test("corrections describe delta and retain both transaction references", () => {
  const transaction = { id: "correction", program: null, storefront: null, reward: null };
  const record: AuditRecord = { ...base, operationType: "POINTS_CORRECTION", details: { points: -60, note: "Error de carga", transaction, correctedTransaction: { ...transaction, id: "original" } } };
  assert.match(auditDetailLines(record)[0], /-60 puntos \(no es el saldo final\)/);
  assert.deepEqual(auditReferences(record).map((reference) => reference.id), ["operation-1", "correction", "original"]);
});

test("staff cancellations distinguish refunds from redemption cost", () => {
  const record: AuditRecord = { ...base, operationType: "EXCHANGE_CANCEL", details: { transaction: null, points: 50, refunded: false } };
  assert.match(auditDetailLines(record)[1], /Sin devolución/);
  assert.match(auditDetailLines({ ...record, details: { ...record.details, refunded: true } })[1], /Se devolvieron 50 puntos/);
  assert.match(auditDetailLines({ ...base, operationType: "EXCHANGE_USER_CANCEL", details: { points: 50, transaction: null } })[0], /se le devolvieron 50 puntos/);
});

test("verification and approval never imply newly awarded points", () => {
  assert.match(auditDetailLines({ ...base, operationType: "EXCHANGE_VERIFY", details: { code: "abc123", transaction: null } })[0], /no confirma la entrega ni modifica los puntos/);
  assert.match(auditDetailLines({ ...base, operationType: "EXCHANGE_APPROVE", details: { points: 100, transaction: null } })[0], /No se sumaron puntos/);
});

test("missing reward names and optional summaries are handled", () => {
  assert.match(auditDetailLines({ ...base, operationType: "REWARD_CLAIM", details: { reward: null, program: null, costPoints: 100 } })[0], /Nombre no disponible/);
  assert.equal(auditDetailLines({ ...base, operationType: "STAFF_CREATE", details: { role: "CASHIER", organization: null, storefront: null } }).length, 1);
  assert.deepEqual(auditReferences({ ...base, operationType: "SESSION_REVOKE", details: {} }), [{ label: "Operación", id: "operation-1" }]);
});

test("records sort newest first across offsets without mutating input", () => {
  const old: AuditRecord = { ...base, operationType: "SESSION_REVOKE", details: {}, createdAt: "2026-10-12T12:00:00-03:00" };
  const newer = { ...old, operationId: "operation-2", createdAt: "2026-10-12T16:00:00Z" };
  const input = [old, newer];
  assert.deepEqual(sortAuditRecords(input), [newer, old]);
  assert.deepEqual(input, [old, newer]);
});
