"use server";

import { request } from "@/lib/api";
import { Reward } from "@/lib/types/reward";

export async function getRewards(storefrontId: string, page: number, size: number = 10) {
  return await request<Reward[]>(`/rewards?${new URLSearchParams(storefrontId)}`);
}
