"use server";

import { ActionResult } from "@/lib/action-result";
import { publicRequest, request } from "@/lib/api";
import { StorefrontDiscoverInfo } from "@/lib/types/storefront";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { cache } from "react";
import { getMembership } from "../actions";

export const getStorefrontDiscoverInfo = cache(async (storefrontId: string): Promise<StorefrontDiscoverInfo> => {
  const result = await publicRequest<StorefrontDiscoverInfo>(`/discover/storefronts/${storefrontId}`);
  if (!result.ok) throw new Error(result.error);
  return result.data;
});

export async function joinStorefront(storefrontId: string): Promise<ActionResult<void> | void> {
  let isMember: boolean;
  try {
    isMember = await getMembership(storefrontId);
  } catch {
    return { ok: false, error: "No pudimos verificar tu membresía. Intentá de nuevo." };
  }
  if (isMember) redirect(`/s/${storefrontId}/inicio`);

  const result = await request<void>(`/users/me/storefronts/${storefrontId}/point-programs`, { method: "POST" });
  if (!result.ok) return result;

  revalidatePath(`/s/${storefrontId}`);
  redirect(`/s/${storefrontId}/inicio`);
}
