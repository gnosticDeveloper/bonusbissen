"use server";

import { ActionResult } from "@/lib/action-result";
import { request } from "@/lib/api";
import { Location, Business, PagedResponse, PointsResponse } from "@/lib/definitions";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

/**
 *
 * @returns An object that details the points and total exchanges made by the logged-in user in each organization they are affiliated with.
 */
export async function getPoints(): Promise<ActionResult<PointsResponse>> {
  return request<PointsResponse>("/exchanges/summary");
}

/**
 * Get all the nearby businesses on the current user's city. This should accept an argument "city" or "postal_code" to avoid showing users businesses out of their interests (the ones that are in other town, city, or even province - too far away).
 *
 * @returns An object containing all local business nearby the logged-in user.
 */
export async function getBusinesses(size: number = 10, city?: string): Promise<ActionResult<Business[]>> {
  const params = new URLSearchParams();
  params.append("size", size.toString());
  if (city) params.append("city", city);

  const result = await request<PagedResponse<Business>>(`/discover/storefronts?${params.toString()}`);
  return result.ok ? { ok: true, data: result.data.items } : result;
}

export async function getLocations(): Promise<ActionResult<Location[]>> {
  return request<Location[]>("/discover/cities");
}

export async function signOut() {
  const cookieStore = await cookies();
  cookieStore.delete("access_token");
  redirect("/sign-in");
}
