import type { Reward } from "@/lib/types/reward";

export const REWARD_FILTERS = [
  { value: "todas", label: "Todas" },
  { value: "canjeables", label: "Canjeables" },
  { value: "proximas", label: "Próximas" },
] as const;

export type RewardFilter = (typeof REWARD_FILTERS)[number]["value"];

/** Reads `?filtro=`; anything unknown shows every reward. */
export function parseRewardFilter(value: string | string[] | undefined): RewardFilter {
  return REWARD_FILTERS.find((filter) => filter.value === value)?.value ?? "todas";
}

export type RewardOverview = {
  /** Cheapest first, so "what's next" reads top to bottom. */
  all: Reward[];
  /** Empty while the balance is unknown: affordability can't be told then. */
  redeemable: Reward[];
  upcoming: Reward[];
  /** The cheapest reward the balance doesn't cover yet. */
  next: Reward | null;
};

/**
 * Splits rewards by what `points` can pay for. This is display only: the backend
 * re-checks the balance on every claim, so a stale balance can't over-spend.
 */
export function overviewRewards(rewards: Reward[], points: number | null): RewardOverview {
  const all = [...rewards].sort((a, b) => a.costPoints - b.costPoints || a.title.localeCompare(b.title, "es"));
  if (points === null) return { all, redeemable: [], upcoming: [], next: null };

  const redeemable = all.filter((reward) => reward.costPoints <= points);
  const upcoming = all.filter((reward) => reward.costPoints > points);
  return { all, redeemable, upcoming, next: upcoming[0] ?? null };
}

export function filterRewards(overview: RewardOverview, filter: RewardFilter): Reward[] {
  if (filter === "canjeables") return overview.redeemable;
  if (filter === "proximas") return overview.upcoming;
  return overview.all;
}

/**
 * How far `points` get toward `costPoints`. `percent` rounds down, so an
 * unaffordable reward never shows a full bar.
 */
export function rewardProgress(costPoints: number, points: number): { missing: number; percent: number } {
  const balance = Math.max(0, points);
  const missing = Math.max(0, costPoints - balance);
  const percent = costPoints > 0 ? Math.min(100, Math.floor((balance / costPoints) * 100)) : 100;
  return { missing, percent };
}
