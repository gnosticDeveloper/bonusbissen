import assert from "node:assert/strict";
import { test } from "node:test";
import { isOverdue, percentChange, timeAgo } from "./dashboard";

const NOW = Date.parse("2026-11-17T15:00:00Z");
const ago = (ms: number) => new Date(NOW - ms).toISOString();
const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

test("waiting time uses the largest whole unit of elapsed time", () => {
  assert.equal(timeAgo(ago(5 * MINUTE), NOW), "hace 5 minutos");
  assert.equal(timeAgo(ago(3 * HOUR + 59 * MINUTE), NOW), "hace 3 horas");
  assert.equal(timeAgo(ago(DAY), NOW), "hace 1 día");
  assert.equal(timeAgo(ago(9 * DAY + 23 * HOUR), NOW), "hace 9 días");
});

test("waiting time never reads zero or future, and unreadable dates give null", () => {
  assert.equal(timeAgo(ago(10_000), NOW), "hace 1 minuto");
  assert.equal(timeAgo(ago(-30_000), NOW), "hace 1 minuto");
  assert.equal(timeAgo("not a date", NOW), null);
});

test("a redemption is overdue only after more than 7 full days", () => {
  assert.equal(isOverdue(ago(7 * DAY), NOW), false);
  assert.equal(isOverdue(ago(7 * DAY + 1), NOW), true);
  assert.equal(isOverdue("not a date", NOW), false);
});

test("percent change is rounded and has no value without a previous figure", () => {
  assert.equal(percentChange(12, 10), 20);
  assert.equal(percentChange(5, 10), -50);
  assert.equal(percentChange(10, 10), 0);
  assert.equal(percentChange(1, 3), -67);
  assert.equal(percentChange(4, 0), null);
});
