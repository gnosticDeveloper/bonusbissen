"use server";

import { request } from "@/lib/api";
import { HomeStats, PendingExchangeReview, TopClient, TopReward } from "./types";

export async function getHomeStats(): Promise<HomeStats> {
  const response = await request("/employees/home-stats");
  const data = await response.json();

  return data;
}

export async function getPendingExchanges(): Promise<PendingExchangeReview[]> {
  // self-reminder: I should probably consider implementing tanstack query to handle UI updates on data mutation and server state.
  // As this app grows, it's becoming hard to manage this type of updates properly without missing any tags.
  const response = await request("/exchanges/pending", { next: { tags: ["pending-exchanges-employee"] } });

  const data = await response.json();
  return data;
}

export async function getTopRewards(): Promise<TopReward[]> {
  const response = await request("/rewards/top");

  const data = await response.json();
  return data;
}

export async function getTopClients(): Promise<TopClient[]> {
  const response = await request("/customers/top");

  const data = await response.json();
  return data;
}

// export async function reactivateCustomer(id: string): Promise<ActionResult<Customer>> {
//   return runAction(async () => {
//     const response = await apiFetch(`/customers/${id}/reactivate`, { method: "PATCH" });
//     return await response.json();
//   });
// }
