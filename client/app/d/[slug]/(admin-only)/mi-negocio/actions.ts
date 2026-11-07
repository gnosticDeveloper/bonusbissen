"use server";

import { revalidatePath } from "next/cache";
import { dashboardRequest, ActionResult } from "@/lib/api";
import { FormState } from "@/app/d/types";
import { Organization } from "@/lib/types/organization";
import { validateImageUpload } from "@/lib/image-upload";
import { Storefront, StorefrontPayload } from "@/lib/types/storefront";
import { PointProgram, PointProgramCreateRequest } from "@/lib/types/point-program";
import { pointProgramUpdatePayloadFrom } from "@/lib/helpers/point-program-settings";

const PATH = "/d/[slug]/(admin-only)/mi-negocio";

const JSON_HEADERS = { "Content-Type": "application/json" };

function toFormState(result: ActionResult<unknown>, successMessage: string): FormState {
  if (!result.ok) return { message: result.error, status: "error" };
  return { message: successMessage, status: "success" };
}

// --- Reads ---

export async function getOrganization(): Promise<ActionResult<Organization>> {
  return await dashboardRequest<Organization>("/organization");
}

export async function getStorefronts(): Promise<ActionResult<Storefront[]>> {
  return await dashboardRequest<Storefront[]>("/storefronts");
}

export async function getPointPrograms(): Promise<ActionResult<PointProgram[]>> {
  return await dashboardRequest<PointProgram[]>("/point-programs");
}

// --- Organization ---

export async function updateOrganization(_prev: FormState, formData: FormData): Promise<FormState> {
  const name = formData.get("org-name") as string;

  const result = await dashboardRequest<Organization>("/organization", {
    method: "POST",
    headers: JSON_HEADERS,
    body: JSON.stringify({ name }),
  });

  if (result.ok) revalidatePath(PATH, "page");
  return toFormState(result, "Datos del negocio actualizados.");
}

export async function uploadOrganizationImage(kind: "logo" | "banner", formData: FormData): Promise<ActionResult<string | null>> {
  if (kind !== "logo" && kind !== "banner") return { ok: false, error: "Tipo de imagen no válido." };
  const image = formData.get("image");
  if (!(image instanceof File)) return { ok: false, error: "Seleccioná una imagen para tu negocio." };
  const error = validateImageUpload(image);
  if (error) return { ok: false, error };

  const body = new FormData();
  body.set("image", image);
  const result = await dashboardRequest<Organization>(`/organization/${kind}`, { method: "POST", body });
  if (!result.ok) return result;
  revalidatePath(PATH, "page");
  return { ok: true, data: result.data?.[kind === "logo" ? "logoUrl" : "bannerUrl"] ?? null };
}

// --- Storefronts ---

function storefrontPayloadFrom(formData: FormData): StorefrontPayload {
  return {
    name: formData.get("name") as string,
    online: formData.get("online") === "true",
    address: (formData.get("address") as string) || undefined,
    city: (formData.get("city") as string) || undefined,
    province: (formData.get("province") as string) || undefined,
    category: (formData.get("category") as string) || undefined,
    color: (formData.get("color") as string) || undefined,
    hours: (formData.get("hours") as string) || undefined,
    description: (formData.get("description") as string) || undefined,
  };
}

export async function createStorefront(_prev: FormState, formData: FormData): Promise<FormState> {
  const result = await dashboardRequest<Storefront>("/storefronts", {
    method: "POST",
    headers: JSON_HEADERS,
    body: JSON.stringify(storefrontPayloadFrom(formData)),
  });

  if (result.ok) revalidatePath(PATH, "page");
  return toFormState(result, "Sucursal creada.");
}

export async function updateStorefront(id: string, _prev: FormState, formData: FormData): Promise<FormState> {
  const payload = { ...storefrontPayloadFrom(formData), active: formData.get("active") === "true" };

  const result = await dashboardRequest<Storefront>(`/storefronts/${id}`, {
    method: "PATCH",
    headers: JSON_HEADERS,
    body: JSON.stringify(payload),
  });

  if (result.ok) revalidatePath(PATH, "page");
  return toFormState(result, "Sucursal actualizada.");
}

export async function deactivateStorefront(id: string): Promise<ActionResult<void>> {
  // The endpoint answers 204; backendFetch treats the empty body as success.
  const result = await dashboardRequest<void>(`/storefronts/${id}`, { method: "DELETE" });
  if (result.ok) revalidatePath(PATH, "page");
  return result;
}

// --- Point programs ---

export async function createPointProgram(_prev: FormState, formData: FormData): Promise<FormState> {
  const payload: PointProgramCreateRequest = {
    name: formData.get("name") as string,
    unitLabel: (formData.get("unitLabel") as string) || undefined,
    storefrontIds: formData.getAll("storefrontIds") as string[],
  };

  const result = await dashboardRequest<PointProgram>("/point-programs", {
    method: "POST",
    headers: JSON_HEADERS,
    body: JSON.stringify(payload),
  });

  if (result.ok) revalidatePath(PATH, "page");
  return toFormState(result, "Programa de puntos creado.");
}

export async function updatePointProgram(id: string, _prev: FormState, formData: FormData): Promise<FormState> {
  const payload = pointProgramUpdatePayloadFrom(formData);
  if (!payload.ok) return { message: payload.error, status: "error" };

  const selected = new Set(formData.getAll("storefrontIds") as string[]);
  const original = new Set(((formData.get("originalStorefrontIds") as string) || "").split(",").filter(Boolean));
  const toAttach = [...selected].filter((id) => !original.has(id));
  const toDetach = [...original].filter((id) => !selected.has(id));

  const result = await dashboardRequest<PointProgram>(`/point-programs/${id}`, {
    method: "PATCH",
    headers: JSON_HEADERS,
    body: JSON.stringify(payload.data),
  });

  if (!result.ok) return toFormState(result, "");

  // The program is saved from here on, so refresh the page even if moving
  // storefronts fails below. Otherwise it would keep showing the old values.
  revalidatePath(PATH, "page");

  if (toAttach.length) {
    const attachResult = await dashboardRequest(`/point-programs/${id}/storefronts`, {
      method: "POST",
      headers: JSON_HEADERS,
      body: JSON.stringify({ storefrontIds: toAttach }),
    });

    if (!attachResult.ok) return toFormState(attachResult, "");
  }
  if (toDetach.length) {
    const detachResult = await dashboardRequest(`/point-programs/${id}/storefronts`, {
      method: "DELETE",
      headers: JSON_HEADERS,
      body: JSON.stringify({ storefrontIds: toDetach }),
    });

    if (!detachResult.ok) return toFormState(detachResult, "");
  }

  return toFormState(result, "Programa de puntos actualizado.");
}
