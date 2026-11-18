"use server";

import { ActionResult, dashboardRequest } from "@/lib/api";
import { HomeStats, PendingExchangeQueue, TopClient, TopReward, UnclaimedReward } from "@/lib/types/dashboard";

export async function getHomeStats(): Promise<ActionResult<HomeStats>> {
  return await dashboardRequest<HomeStats>("/users/home-stats");
}

/** The `limit` oldest pending redemptions (the backend accepts 1-100) and the size of the whole queue. */
export async function getPendingQueue(limit: number): Promise<ActionResult<PendingExchangeQueue>> {
  // self-reminder: I should probably consider implementing tanstack query to handle UI updates on data mutation and server state.
  // As this app grows, it's becoming hard to manage this type of updates properly without missing any tags.
  return await dashboardRequest<PendingExchangeQueue>(`/exchanges/pending-queue?limit=${limit}`);
}

export async function getPendingCount(): Promise<ActionResult<number>> {
  return await dashboardRequest<number>("/exchanges/pending-count");
}

/** Delivers redemption `id` only if `code` is the one its customer holds; a 400 means it isn't. */
export async function approveExchangeWithCode(id: string, code: string): Promise<ActionResult<void>> {
  return await dashboardRequest<void>("/exchanges/approve-with-code", {
    method: "POST",
    body: JSON.stringify({ id, code }),
    headers: { "Content-Type": "application/json" },
  });
}

export async function getTopRewards(): Promise<ActionResult<TopReward[]>> {
  return await dashboardRequest<TopReward[]>("/rewards/top");
}

export async function getTopClients(): Promise<ActionResult<TopClient[]>> {
  return await dashboardRequest<TopClient[]>("/users/top");
}

export async function getUnclaimedRewards(): Promise<ActionResult<UnclaimedReward[]>> {
  return await dashboardRequest<UnclaimedReward[]>("/rewards/unclaimed");
}
