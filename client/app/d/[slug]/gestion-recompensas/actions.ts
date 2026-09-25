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

  if (!res.ok) throw new Error("Error creando la recompensa.");
  updateTag("reward-list");
  return res.data;
}

export async function editReward(id: string, formData: FormData) {
  const res = await dashboardRequest<Reward>(`/rewards/${id}`, {
    method: "PUT",
    body: formData,
  });

  if (!res.ok) throw new Error("Error creando la recompensa.");
  updateTag("reward-list");
  return res.data;
}
export async function deleteReward(id: string) {
  const res = await dashboardRequest(`/rewards/${id}`, {
    method: "DELETE",
  });
  updateTag("reward-list");

  if (!res.ok) throw new Error("Error eliminando la recompensa.");
}
