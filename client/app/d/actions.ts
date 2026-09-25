"use server";

import { dashboardRequest } from "@/lib/api";
import { HomeStats, PendingExchangeReview, TopClient, TopReward } from "./types";
import { ActionResult } from "@/lib/action-result";

export async function getHomeStats(): Promise<ActionResult<HomeStats>> {
  return await dashboardRequest<HomeStats>("/users/home-stats");
}

export async function getPendingExchanges(): Promise<ActionResult<PendingExchangeReview[]>> {
  // self-reminder: I should probably consider implementing tanstack query to handle UI updates on data mutation and server state.
  // As this app grows, it's becoming hard to manage this type of updates properly without missing any tags.
  return await dashboardRequest<PendingExchangeReview[]>("/exchanges/pending", { next: { tags: ["pending-exchanges-employee"] } });
}

export async function getTopRewards(): Promise<ActionResult<TopReward[]>> {
  return await dashboardRequest<TopReward[]>("/rewards/top");
}

export async function getTopClients(): Promise<ActionResult<TopClient[]>> {
  return await dashboardRequest<TopClient[]>("/users/top");
}

// export async function reactivateCustomer(id: string): Promise<ActionResult<Customer>> {
//   return runAction(async () => {
//     const response = await apiFetch(`/customers/${id}/reactivate`, { method: "PATCH" });
//     return await response.json();
//   });
// }
