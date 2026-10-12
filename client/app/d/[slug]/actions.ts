"use server";

import { ActionResult } from "@/lib/action-result";
import { logoutFromBackend } from "@/lib/auth/logout";
import { DASHBOARD_ACCESS_COOKIE, DASHBOARD_REFRESH_COOKIE, DASHBOARD_STOREFRONTS_COOKIE } from "@/lib/auth/refresh";
import { dashboardRequest } from "@/lib/api";
import { AdminUserInfo } from "@/lib/definitions";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";

export async function signOut(): Promise<void> {
  const cookieStore = await cookies();
  await logoutFromBackend(cookieStore.get(DASHBOARD_ACCESS_COOKIE)?.value, cookieStore.get(DASHBOARD_REFRESH_COOKIE)?.value);
  cookieStore.delete(DASHBOARD_ACCESS_COOKIE);
  cookieStore.delete(DASHBOARD_REFRESH_COOKIE);
  cookieStore.delete(DASHBOARD_STOREFRONTS_COOKIE);
  redirect("/d/sign-in");
}

export const getCurrentUser = cache(async (): Promise<ActionResult<AdminUserInfo>> => {
  return await dashboardRequest<AdminUserInfo>("/users/me/admin");
});
