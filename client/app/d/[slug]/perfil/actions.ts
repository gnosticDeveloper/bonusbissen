"use server";

import { dashboardRequest } from "@/lib/api";
import { AdminUserInfo } from "@/lib/definitions";

export async function updateProfile(input: { name: string; email: string }) {
  return dashboardRequest<AdminUserInfo>("/users/me", {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}

export async function updatePassword(input: { currentPassword: string; newPassword: string }) {
  return dashboardRequest<void>("/users/me/password", {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}
