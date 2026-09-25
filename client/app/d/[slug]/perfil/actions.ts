"use server";

import { dashboardRequest } from "@/lib/api";
import type { ActionResult } from "@/lib/action-result";
import { AdminUserInfo } from "@/lib/definitions";

export async function updateProfile(input: { name: string; email: string }): Promise<ActionResult<AdminUserInfo>> {
  return dashboardRequest<AdminUserInfo>("/users/me", {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}

export async function updatePassword(input: { currentPassword: string; newPassword: string }): Promise<ActionResult<void>> {
  return dashboardRequest<void>("/users/me/password", {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}
