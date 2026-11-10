"use server";

import { clearAllSessions } from "@/lib/auth/refresh";
import { ActionResult, dashboardRequest } from "@/lib/api";
import { AdminUserInfo } from "@/lib/types/user";
import { redirect } from "next/navigation";
import { cache } from "react";

export async function signOut(): Promise<void> {
  await clearAllSessions();
  redirect("/d/sign-in");
}

export const getCurrentUser = cache(async (): Promise<ActionResult<AdminUserInfo>> => {
  return await dashboardRequest<AdminUserInfo>("/users/me/admin");
});
