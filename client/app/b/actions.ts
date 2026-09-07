"use server";

import { ActionResult } from "@/lib/action-result";
import { request } from "@/lib/api";
import { getSessionToken } from "@/lib/auth/session";
import { NearbyBusiness, PointsResponse } from "@/lib/definitions";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

/**
 *
 * @returns An object that details the points and total exchanges made by the logged-in user in each organization they are affiliated with.
 */
export async function getPoints(): Promise<ActionResult<PointsResponse>> {
  const token = await getSessionToken();
  if (!token) return { ok: false, error: "Necesitás iniciar sesión." };
  return request<PointsResponse>("/exchanges/summary");
}

/**
 * Get all the nearby businesses on the current user's city. This should accept an argument "city" or "postal_code" to avoid showing users businesses out of their interests (the ones that are in other town, city, or even province - too far away).
 *
 * @returns An object containing all local business nearby the logged-in user.
 */
export async function getNearbyBusinesses(): Promise<ActionResult<NearbyBusiness[]>> {
  const token = await getSessionToken();
  if (!token) return { ok: false, error: "Necesitás iniciar sesión." };
  const result = await request<{ businesses: NearbyBusiness[] }>("/organizations");
  return result.ok ? { ok: true, data: result.data.businesses } : result;
}

export async function signOut() {
  const cookieStore = await cookies();
  cookieStore.delete("access_token");
  redirect("/sign-in");
}
