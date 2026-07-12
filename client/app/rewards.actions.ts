"use server";

import type { Reward } from "@/lib/definitions";
import { cookies } from "next/headers";

export async function getRewards(): Promise<Reward[]> {
  const token = (await cookies()).get("bb_token")?.value;

  const response = await fetch(`http://localhost:8080/api/rewards`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) throw new Error("No se pudo obtener las recompensas");
  const data: Reward[] = await response.json();
  return data;
}

export async function getReward(id: string): Promise<Reward> {
  const token = (await cookies()).get("bb_token")?.value;

  const res = await fetch(`${process.env.API_URL}/rewards/${id}`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) throw new Error("No se pudo obtener la recompensa");
  return await res.json();
}

export async function createReward(formData: FormData): Promise<Reward> {
  const token = (await cookies()).get("bb_token")?.value;

  const res = await fetch(`${process.env.API_URL}/rewards`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: formData, // esto no necesita Content-Type manual
  });

  if (!res.ok) throw new Error("No se pudo crear la recompensa");
  return await res.json();
}

export async function updateReward(id: string, formData: FormData): Promise<Reward> {
  const token = (await cookies()).get("bb_token")?.value;

  const res = await fetch(`${process.env.API_URL}/rewards/${id}`, {
    method: "PATCH",
    headers: { Authorization: `Bearer ${token}` },
    body: formData,
  });

  if (!res.ok) throw new Error("No se pudo actualizar la recompensa");
  return await res.json();
}

export async function deleteReward(id: string): Promise<void> {
  const token = (await cookies()).get("bb_token")?.value;

  const res = await fetch(`${process.env.API_URL}/rewards/${id}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) throw new Error("No se pudo eliminar la recompensa");
}

export type TopReward = {
  id: string;
  name: string;
  exchangeCount: number;
  points: number;
};

export async function getTopRewards(): Promise<TopReward[]> {
  const token = (await cookies()).get("bb_token")?.value;

  const response = await fetch("http://localhost:8080/api/rewards/top", {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  const data = await response.json();
  return data;
}
