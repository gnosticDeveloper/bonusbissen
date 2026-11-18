import assert from "node:assert/strict";
import { test } from "node:test";
import type { MovementResponse } from "@/lib/types/movement";
import { filterMovements, groupMovementsByMonth, parseMovementFilter } from "./movements";

function movement(id: string, type: MovementResponse["type"], createdAt: string): MovementResponse {
  return {
    id,
    type,
    points: type === "earn" ? 100 : -100,
    title: id,
    formattedCreatedAt: "",
    createdAt,
    expiresAt: null,
    expirationApplicable: false,
    correction: type === "adjust",
    correctedTransactionId: null,
    correctedTransactionAmount: null,
  };
}

test("months follow Argentina time, not UTC", () => {
  // 02:00 UTC on 1 Nov is still 31 Oct, 23:00 in Buenos Aires.
  const groups = groupMovementsByMonth([movement("late", "earn", "2026-11-01T02:00:00Z")]);
  assert.deepEqual(groups.map((group) => group.label), ["Octubre 2026"]);
});

test("groups keep the backend's newest-first order and put unreadable dates in their own group", () => {
  const groups = groupMovementsByMonth([
    movement("n2", "earn", "2026-11-14T21:00:00Z"),
    movement("n1", "redeem", "2026-11-03T21:00:00Z"),
    movement("o1", "earn", "2026-10-15T21:00:00Z"),
    movement("bad", "earn", "no-date"),
  ]);
  assert.deepEqual(groups.map((group) => group.label), ["Noviembre 2026", "Octubre 2026", "Fecha no disponible"]);
  assert.deepEqual(groups[0].items.map((item) => item.id), ["n2", "n1"]);
});

test("expirations fold into the adjustments filter", () => {
  const movements = [
    movement("earn", "earn", "2026-11-01T12:00:00Z"),
    movement("redeem", "redeem", "2026-11-01T12:00:00Z"),
    movement("adjust", "adjust", "2026-11-01T12:00:00Z"),
    movement("expire", "expire", "2026-11-01T12:00:00Z"),
  ];
  assert.deepEqual(filterMovements(movements, parseMovementFilter("ajustes")).map((m) => m.id), ["adjust", "expire"]);
  assert.deepEqual(filterMovements(movements, parseMovementFilter("sumas")).map((m) => m.id), ["earn"]);
  assert.deepEqual(filterMovements(movements, parseMovementFilter("canjes")).map((m) => m.id), ["redeem"]);
  assert.equal(filterMovements(movements, parseMovementFilter(undefined)).length, 4);
});
