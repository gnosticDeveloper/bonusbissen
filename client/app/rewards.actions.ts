"use server";

import { apiFetch } from "@/lib/api";
import { ActionResult, runAction } from "@/lib/action-result";
import type { Reward } from "@/lib/definitions";
import { updateTag } from "next/cache";

export async function getRewards(search: string | string[] | undefined): Promise<Reward[]> {
  const response = await apiFetch(
    `/rewards${search ? `?search=${search}` : ""}`,
    {
      next: {
        tags: ["get-rewards"],
      },
    },
    { tokenKey: "employee_token", redirectTo: "/login" },
  );

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
  const reward: Reward = await res.json();

  return {
    ...reward,
    imagePath: reward.imagePath ? `${process.env.ASSETS_URL}${reward.imagePath}` : undefined,
  };
}

export async function createReward(formData: FormData): Promise<ActionResult<Reward>> {
  return runAction(async () => {
    const res = await apiFetch(
      `/rewards`,
      {
        method: "POST",
        body: formData, // esto no necesita Content-Type manual
      },
      { redirectTo: "/login", tokenKey: "employee_token" },
    );
    const reward = await res.json();
    updateTag("get-rewards");
    return reward;
  });
}

export async function updateReward(id: string, formData: FormData): Promise<ActionResult<Reward>> {
  return runAction(async () => {
    const res = await apiFetch(
      `/rewards/${id}`,
      {
        method: "PUT",
        body: formData,
      },
      { redirectTo: "/login", tokenKey: "employee_token" },
    );
    return await res.json();
  });
}

export async function deleteReward(id: string): Promise<ActionResult<void>> {
  return runAction(async () => {
    await apiFetch(
      `/rewards/${id}`,
      {
        method: "DELETE",
      },
      { redirectTo: "/login", tokenKey: "employee_token" },
    );
    updateTag("get-rewards");
  });
}
