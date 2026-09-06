"use server";

import { ActionResult } from "@/lib/action-result";
import { request } from "@/lib/api";
import { getSessionToken } from "@/lib/auth/session";
import { NearbyBusiness, PointsResponse } from "@/lib/definitions";

export async function getPoints(): Promise<ActionResult<PointsResponse>> {
  const token = await getSessionToken();
  if (!token) return { ok: false, error: "Necesitás iniciar sesión." };
  return request<PointsResponse>("/points");
}

export async function getNearbyBusinesses(): Promise<ActionResult<NearbyBusiness[]>> {
  const token = await getSessionToken();
  if (!token) return { ok: false, error: "Necesitás iniciar sesión." };
  const result = await request<{ businesses: NearbyBusiness[] }>("/businesses/nearby");
  return result.ok ? { ok: true, data: result.data.businesses } : result;
}
