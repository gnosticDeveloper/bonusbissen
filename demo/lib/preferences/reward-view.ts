import { setPreferenceCookie } from "./cookie";

export type RewardView = "list" | "grid";

export const REWARD_VIEW_COOKIE_NAME = "reward-view";

/** Interprets the raw cookie value; anything else is the grid view. */
export function rewardViewFrom(value: string | undefined): RewardView {
  return value === "list" ? "list" : "grid";
}

export function persistRewardView(view: RewardView): void {
  setPreferenceCookie(REWARD_VIEW_COOKIE_NAME, view);
}
