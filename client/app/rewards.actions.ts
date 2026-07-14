"use server";

import { apiFetch } from "@/lib/api";
import type { Reward } from "@/lib/definitions";
import { revalidateTag } from "next/cache";

export async function getRewards(): Promise<Reward[]> {
  const response = await apiFetch(`/rewards`, {
    next: {
      tags: ["get-rewards"],
    }
  }, { tokenKey: "employee_token", redirectTo: "/login" });

  if (!response.ok) throw new Error("No se pudo obtener las recompensas");
  const data: Reward[] = await response.json();

  const formattedData = data.map((r) => ({
    ...r,
    imagePath: r.imagePath ? `${process.env.ASSETS_URL}${r.imagePath}` : undefined,
  }));

  return formattedData;
}

export async function getReward(id: string): Promise<Reward> {
  const res = await apiFetch(`/rewards/${id}`);

  if (!res.ok) throw new Error("No se pudo obtener la recompensa");
  return await res.json();
}

export async function createReward(formData: FormData): Promise<void> {

  const res = await apiFetch(`/rewards`, {
    method: "POST",
    body: formData, // esto no necesita Content-Type manual
  });

  if (!res.ok) throw new Error("No se pudo crear la recompensa");
  revalidateTag("get-rewards", "max");
}

export async function updateReward(id: string, formData: FormData): Promise<Reward> {

  const res = await apiFetch(`/rewards/${id}`, {
    method: "PATCH",
    body: formData,
  });

  if (!res.ok) throw new Error("No se pudo actualizar la recompensa");
  return await res.json();
}

export async function deleteReward(id: string): Promise<void> {

  const res = await apiFetch(`/rewards/${id}`, {
    method: "DELETE",
  });

  if (!res.ok) throw new Error("No se pudo eliminar la recompensa");
}
