"use server";

import { request } from "@/lib/api";
import { currentUserId } from "@/lib/auth/session";
import { PagedResponse } from "@/lib/types/paging";
import { Reward } from "@/lib/types/reward";
import { revalidatePath } from "next/cache";
import { cache } from "react";

// Affordability filters, counts and "next reward" need the whole catalogue at once, so the
// storefront reads one large page instead of paging. Programs hold far fewer rewards than this;
// callers compare `totalElements` with `items.length` to tell when the list was cut short.
const STOREFRONT_REWARDS_LIMIT = 100;

/** The active rewards of the storefront's point program (`GET /rewards` returns active ones only). */
export const getStorefrontRewards = cache(async (storefrontId: string) => {
  const params = new URLSearchParams({
    storefrontId,
    page: "0",
    size: STOREFRONT_REWARDS_LIMIT.toString(),
  });

  return request<PagedResponse<Reward>>(`/rewards?${params}`);
});

export async function claimReward(rewardId: string) {
  const userId = await currentUserId();

  const res = await request<{ code: string }>("/users/claim-reward", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ userId, rewardId }),
  });

  // The claim deducted points: balance, affordability and history are all stale now.
  if (res.ok) revalidatePath("/s/[slug]", "layout");

  return res;
}
