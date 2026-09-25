"use server";

import { request } from "@/lib/api";
import { cache } from "react";

export const getMembership = cache(async (storefrontId: string): Promise<boolean> => {
  const result = await request<{ member: boolean }>(`/users/me/storefronts/${storefrontId}/membership`);
  // Note: if the backend does not response properly then better redirect to home.
  if (!result.ok) return false;
  // if (!result.ok) throw new Error(result.error);
  return result.data.member;
});
