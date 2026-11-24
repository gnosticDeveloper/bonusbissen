import assert from "node:assert/strict";
import { test } from "node:test";
import type { Reward } from "@/lib/types/reward";
import { filterRewards, overviewRewards, parseRewardFilter, rewardProgress } from "./reward-progress";

function reward(id: string, costPoints: number): Reward {
  return { id, title: `Recompensa ${id}`, description: "", costPoints, discountValue: 0, active: true, createdAtFormatted: "" };
}

const rewards = [reward("c", 400), reward("a", 120), reward("b", 250)];

test("a reward costing exactly the balance is redeemable, and the next one is the cheapest unaffordable", () => {
  const overview = overviewRewards(rewards, 250);
  assert.deepEqual(overview.all.map((r) => r.id), ["a", "b", "c"]);
  assert.deepEqual(overview.redeemable.map((r) => r.id), ["a", "b"]);
  assert.deepEqual(overview.upcoming.map((r) => r.id), ["c"]);
  assert.equal(overview.next?.id, "c");
});

test("an unknown balance claims nothing about affordability", () => {
  const overview = overviewRewards(rewards, null);
  assert.equal(overview.all.length, 3);
  assert.equal(overview.redeemable.length, 0);
  assert.equal(overview.upcoming.length, 0);
  assert.equal(overview.next, null);
});

test("filters map to their groups and unknown values fall back to every reward", () => {
  const overview = overviewRewards(rewards, 250);
  assert.equal(filterRewards(overview, parseRewardFilter("canjeables")).length, 2);
  assert.equal(filterRewards(overview, parseRewardFilter("proximas")).length, 1);
  assert.equal(filterRewards(overview, parseRewardFilter("otra")).length, 3);
  assert.equal(parseRewardFilter(["canjeables", "proximas"]), "todas");
});

test("progress rounds down so an unaffordable reward never shows a full bar", () => {
  assert.deepEqual(rewardProgress(1000, 999), { missing: 1, percent: 99 });
  assert.deepEqual(rewardProgress(400, 250), { missing: 150, percent: 62 });
  assert.deepEqual(rewardProgress(200, 250), { missing: 0, percent: 100 });
  assert.deepEqual(rewardProgress(200, -30), { missing: 200, percent: 0 });
});
