"use server";

import { ActionResult } from "@/lib/action-result";
import { dashboardRequest } from "@/lib/api";
import { AdminUserInfo } from "@/lib/definitions";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";

export async function signOut(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete("d_token");
  redirect("/d/sign-in");
}

export const getCurrentUser = cache(async (): Promise<ActionResult<AdminUserInfo>> => {
  console.info("Trayendo los datos del usuario.");
  return await dashboardRequest<AdminUserInfo>("/users/me/admin");
});
