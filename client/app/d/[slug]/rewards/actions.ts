"use server";

import { apiServer } from "@/lib/api";
import type { Reward } from "@/lib/types/reward";

export async function getRewards(query?: string) {
  const params = new URLSearchParams();

  if (query) params.append("search", query);

  const res = await apiServer(`/rewards?${params.toString()}`);

  if (!res.ok) throw new Error("Error consiguiendo la lista de recompensas.");

  return (await res.json()) as Reward[];
}

export async function createReward(formData: FormData) {
  const res = await apiServer("/rewards", {
    method: "POST",
    body: formData,
  });

  if (!res.ok) throw new Error("Error creando la recompensa.");

  return (await res.json()) as Reward;
}

export async function editReward(id: string, formData: FormData) {
  const res = await apiServer(`/rewards/${id}`, {
    method: "PUT",
    body: formData,
  });

  if (!res.ok) throw new Error("Error creando la recompensa.");

  return (await res.json()) as Reward;
}
export async function deleteReward(id: string) {
  const res = await apiServer(`/rewards/${id}`, {
    method: "DELETE",
  });

  if (!res.ok) throw new Error("Error creando la recompensa.");
}
