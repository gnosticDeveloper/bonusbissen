"use server";

import { ActionResult } from "@/lib/action-result";
import { dashboardRequest } from "@/lib/api";
import type { Reward } from "@/lib/types/reward";

export async function getRewards(query?: string): Promise<ActionResult<Reward[]>> {
  const params = new URLSearchParams();

  if (query) params.append("search", query);

  return await dashboardRequest<Reward[]>(`/rewards?${params.toString()}`);
}

export async function createReward(formData: FormData): Promise<Reward> {
  const res = await dashboardRequest<Reward>("/rewards", {
    method: "POST",
    body: formData,
  });

  if (!res.ok) throw new Error("Error creando la recompensa.");

  return res.data;
}

export async function editReward(id: string, formData: FormData) {
  const res = await dashboardRequest<Reward>(`/rewards/${id}`, {
    method: "PUT",
    body: formData,
  });

  if (!res.ok) throw new Error("Error creando la recompensa.");

  return res.data;
}
export async function deleteReward(id: string) {
  const res = await dashboardRequest(`/rewards/${id}`, {
    method: "DELETE",
  });

  if (!res.ok) throw new Error("Error creando la recompensa.");
}
