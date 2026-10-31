import assert from "node:assert/strict";
import { test } from "node:test";
import { pointExpirationStatus } from "./point-expiration";

const NOW = Date.parse("2026-10-19T15:30:00Z");
const DAY = 24 * 60 * 60 * 1000;
const deadlineIn = (milliseconds: number) => ({
  expirationApplicable: true,
  expiresAt: new Date(NOW + milliseconds).toISOString(),
});

test("expiration does not apply to redemptions, corrections, or voided lots", () => {
  assert.equal(pointExpirationStatus({ ...deadlineIn(DAY), expirationApplicable: false }, NOW), null);
  assert.equal(pointExpirationStatus({ expirationApplicable: false, expiresAt: null }, NOW), null);
});

test("an applicable null deadline explicitly means no expiration", () => {
  const status = pointExpirationStatus({ expirationApplicable: true, expiresAt: null }, NOW);
  assert.equal(status?.label, "Sin vencimiento");
  assert.equal(status?.severity, "none");
  assert.equal(status?.deadline, null);
});

test("less than 24 hours, including the last millisecond, uses the critical label", () => {
  for (const milliseconds of [1, 1000, 60 * 60 * 1000, DAY - 1]) {
    const status = pointExpirationStatus(deadlineIn(milliseconds), NOW);
    assert.equal(status?.label, "Expira en menos de 24 horas");
    assert.equal(status?.severity, "critical");
  }
});

test("one complete remaining day uses the singular, without rounding sub-24h up", () => {
  for (const milliseconds of [DAY, DAY + 1, 2 * DAY - 1]) {
    assert.equal(pointExpirationStatus(deadlineIn(milliseconds), NOW)?.label, "Expira en 1 día");
  }
  assert.equal(pointExpirationStatus(deadlineIn(2 * DAY), NOW)?.label, "Expira en 2 días");
});

test("longer periods report full remaining days in Spanish", () => {
  assert.equal(pointExpirationStatus(deadlineIn(15.5 * DAY), NOW)?.label, "Expira en 15 días");
  assert.equal(pointExpirationStatus(deadlineIn(90 * DAY), NOW)?.label, "Expira en 90 días");
});

test("warning severity progresses at the exact 30-day, 7-day and 24-hour boundaries", () => {
  for (const [remaining, severity] of [
    [31 * DAY, "normal"],
    [30 * DAY + 1, "normal"],
    [30 * DAY, "warning"],
    [7 * DAY + 1, "warning"],
    [7 * DAY, "urgent"],
    [DAY, "urgent"],
    [DAY - 1, "critical"],
    [0, "expired"],
  ] as const) {
    assert.equal(pointExpirationStatus(deadlineIn(remaining), NOW)?.severity, severity);
  }
});

test("points are expired at the exact deadline and afterward", () => {
  for (const milliseconds of [0, -1, -DAY, -365 * DAY]) {
    const status = pointExpirationStatus(deadlineIn(milliseconds), NOW);
    assert.equal(status?.label, "Puntos expirados");
    assert.equal(status?.severity, "expired");
  }
});

test("an explicit EXPIRE transaction remains expired even before client clock catches up", () => {
  const status = pointExpirationStatus({ ...deadlineIn(DAY), expired: true }, NOW);
  assert.equal(status?.label, "Puntos expirados");
  assert.equal(status?.severity, "expired");
  assert.equal(pointExpirationStatus({ expirationApplicable: true, expiresAt: null, expired: true }, null)?.label, "Puntos expirados");
});

test("timestamps with offsets are compared as instants, not browser calendar dates", () => {
  const status = pointExpirationStatus({ expirationApplicable: true, expiresAt: "2026-10-20T12:30:00-03:00" }, NOW);
  assert.equal(status?.label, "Expira en 1 día");
  assert.match(status?.formattedDeadline ?? "", /12:30/);
  assert.equal(pointExpirationStatus({ expirationApplicable: true, expiresAt: "2026-10-19T12:30:00-03:00" }, NOW)?.label, "Puntos expirados");
});

test("deadline formatting is deterministic across locale defaults and uses a 24-hour clock", () => {
  for (const [expiresAt, expected] of [
    ["2026-10-20T00:09:26.605254Z", "19/10/2026, 21:09"],
    ["2026-10-20T03:00:00Z", "20/10/2026, 00:00"],
    ["2026-10-20T12:05:00-03:00", "20/10/2026, 12:05"],
  ]) {
    const data = { expirationApplicable: true, expiresAt };
    assert.equal(pointExpirationStatus(data, null)?.formattedDeadline, expected);
    assert.equal(pointExpirationStatus(data, NOW)?.formattedDeadline, expected);
  }
});

test("invalid or timezone-ambiguous deadlines do not masquerade as unlimited points", () => {
  for (const expiresAt of ["", "not-a-date", "2026-10-20", "2026-10-20T12:30:00", "2026-99-99T12:30:00Z"]) {
    assert.equal(pointExpirationStatus({ expirationApplicable: true, expiresAt }, NOW), null);
  }
});

test("SSR and initial hydration have a deterministic absolute-date fallback", () => {
  const data = deadlineIn(DAY);
  const status = pointExpirationStatus(data, null);
  assert.equal(status?.label, "Con vencimiento");
  assert.equal(status?.deadline, data.expiresAt);
  assert.match(status?.formattedDeadline ?? "", /2026/);
  assert.equal(pointExpirationStatus(data, NOW + DAY)?.label, "Puntos expirados");
});
