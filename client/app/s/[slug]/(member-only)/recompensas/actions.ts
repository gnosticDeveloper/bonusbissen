"use server";

import { request } from "@/lib/api";
import { Reward } from "@/lib/types/reward";

// TODO: should implement pagination and also send page: number, size: number = 10
export async function getRewards(storefrontId: string) {
  return await request<Reward[]>(`/rewards?${new URLSearchParams(storefrontId)}`);
}
