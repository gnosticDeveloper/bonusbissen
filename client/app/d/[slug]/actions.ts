"use server";

import { ActionResult } from "@/lib/action-result";
import { logoutFromBackend } from "@/lib/auth/logout";
import { dashboardRequest } from "@/lib/api";
import { AdminUserInfo } from "@/lib/definitions";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";

export async function signOut(): Promise<void> {
  const cookieStore = await cookies();
  await logoutFromBackend(cookieStore.get("d_token")?.value);
  cookieStore.delete("d_token");
  cookieStore.delete("d_storefronts");
  redirect("/d/sign-in");
}

export const getCurrentUser = cache(async (): Promise<ActionResult<AdminUserInfo>> => {
  return await dashboardRequest<AdminUserInfo>("/users/me/admin");
});
