"use server";

import { request } from "@/lib/api";
import { currentUserId } from "@/lib/auth/session";
import { PagedResponse } from "@/lib/definitions";
import { Reward } from "@/lib/types/reward";

// TODO: should implement pagination and also send page: number, size: number = 10
export async function getRewards(storefrontId: string, { page = 0, size = 10 }: { page?: number; size?: number } = {}) {
  const params = new URLSearchParams({
    storefrontId,
    page: page.toString(),
    size: size.toString(),
  });

  return await request<PagedResponse<Reward>>(`/rewards?${params}`);
}

export async function claimReward(rewardId: string) {
  const userId = await currentUserId();

  const res = await request<{ code: string }>("/users/claim-reward", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ userId, rewardId }),
  });

  return res;
}
