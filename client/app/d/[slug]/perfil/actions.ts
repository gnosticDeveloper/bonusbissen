"use server";

import { ActionResult, dashboardRequest } from "@/lib/api";
import { AdminUserInfo } from "@/lib/types/user";
import { validateImageUpload } from "@/lib/image-upload";

/** Uploads the staff member's own profile picture; returns its new public URL. */
export async function uploadAvatar(formData: FormData): Promise<ActionResult<string | null>> {
  const image = formData.get("image");
  if (!(image instanceof File)) return { ok: false, error: "Seleccioná una imagen para tu perfil." };
  const error = validateImageUpload(image);
  if (error) return { ok: false, error };

  const body = new FormData();
  body.set("image", image);
  const result = await dashboardRequest<{ avatarUrl: string | null }>("/users/me/avatar", { method: "POST", body });
  if (!result.ok) return result;
  return { ok: true, data: result.data?.avatarUrl ?? null };
}

/** Clears the profile picture; the backend also deletes the image from storage. */
export async function removeAvatar(): Promise<ActionResult<void>> {
  const result = await dashboardRequest<unknown>("/users/me/avatar", { method: "DELETE" });
  if (!result.ok) return result;
  return { ok: true, data: undefined };
}

export async function updateProfile(input: { name: string; email: string }) {
  return dashboardRequest<AdminUserInfo>("/users/me", {
    method: "PATCH",
    body: JSON.stringify(input),
    headers: {
      "Content-Type": "application/json",
    },
  });
}

export async function updatePassword(input: { currentPassword: string; newPassword: string }) {
  return dashboardRequest<void>("/users/me/password", {
    method: "PATCH",
    body: JSON.stringify(input),
    headers: {
      "Content-Type": "application/json",
    },
  });
}
