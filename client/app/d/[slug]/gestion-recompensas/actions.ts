"use server";

import { dashboardRequest } from "@/lib/api";
import { PagedResponse } from "@/lib/definitions";
import type { Reward } from "@/lib/types/reward";
import { updateTag } from "next/cache";

export async function getRewards(query?: string, { page = 0 }: { page?: number } = {}) {
  const params = new URLSearchParams();

  if (query) params.append("search", query);
  params.append("page", String(page));
  params.append("size", "10");

  return await dashboardRequest<PagedResponse<Reward>>(`/rewards?${params.toString()}`, { next: { tags: ["reward-list"] } });
}

export async function createReward(formData: FormData) {
  const res = await dashboardRequest<Reward>("/rewards", {
    method: "POST",
    body: formData,
  });

  if (res.ok) updateTag("reward-list");
  return res;
}

export async function editReward(id: string, formData: FormData) {
  const res = await dashboardRequest<Reward>(`/rewards/${id}`, {
    method: "PUT",
    body: formData,
  });

  if (res.ok) updateTag("reward-list");
  return res;
}
export async function deleteReward(id: string) {
  const res = await dashboardRequest<void>(`/rewards/${id}`, {
    method: "DELETE",
  });

  if (res.ok) updateTag("reward-list");
  return res;
}
