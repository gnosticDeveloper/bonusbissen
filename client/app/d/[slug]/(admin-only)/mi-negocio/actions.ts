"use server";

import { revalidatePath } from "next/cache";
import { dashboardRequest, ActionResult } from "@/lib/api";
import { FormState } from "@/app/d/types";
import { Organization } from "@/lib/types/organization";
import { validateImageUpload } from "@/lib/image-upload";
import { Storefront, StorefrontPayload } from "@/lib/types/storefront";
import { PointProgram, PointProgramCreateRequest } from "@/lib/types/point-program";
import { pointProgramUpdatePayloadFrom } from "@/lib/helpers/point-program-settings";
import { parseOrError } from "@/lib/action-helpers";
import { z } from "zod";

const PATH = "/d/[slug]/(admin-only)/mi-negocio";

const JSON_HEADERS = { "Content-Type": "application/json" };

// --- Input ---
// Limits follow the database columns (and the onboarding form), so a long value
// gets a clear message instead of a failed request.

const NAME_TOO_LONG = "El nombre no puede superar los 255 caracteres.";

/** An optional text field. Left empty, it isn't sent at all. */
function optionalText(max: number, message: string) {
  return z.string().trim().max(max, message).transform((value) => value || undefined).optional();
}

const organizationNameSchema = z.string().trim().min(1, "Completá el nombre del negocio.").max(255, NAME_TOO_LONG);

const storefrontSchema = z.object({
  name: z.string().trim().min(1, "Completá el nombre de la sucursal.").max(255, NAME_TOO_LONG),
  address: optionalText(255, "La dirección no puede superar los 255 caracteres."),
  city: optionalText(120, "La localidad no puede superar los 120 caracteres."),
  province: optionalText(120, "La provincia no puede superar los 120 caracteres."),
  category: optionalText(80, "El rubro no puede superar los 80 caracteres."),
  color: z.string().regex(/^#[0-9a-f]{6}$/i, "Elegí un color válido.").optional(),
  hours: optionalText(255, "El horario no puede superar los 255 caracteres."),
  description: optionalText(2000, "La descripción no puede superar los 2000 caracteres."),
});

const storefrontIdsSchema = z.array(z.uuid("Una de las sucursales elegidas ya no está disponible. Volvé a cargar la página."));

const pointProgramCreateSchema = z.object({
  name: z.string().trim().min(1, "Completá el nombre del programa.").max(255, NAME_TOO_LONG),
  unitLabel: optionalText(50, "El nombre de los puntos no puede superar los 50 caracteres."),
  storefrontIds: storefrontIdsSchema,
});

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
  const name = parseOrError(organizationNameSchema, formData.get("org-name"));
  if (!name.ok) return toFormState(name, "");

  const result = await dashboardRequest<Organization>("/organization", {
    method: "POST",
    headers: JSON_HEADERS,
    body: JSON.stringify({ name: name.data }),
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

function storefrontPayloadFrom(formData: FormData): ActionResult<StorefrontPayload> {
  const fields = parseOrError(storefrontSchema, Object.fromEntries(formData));
  if (!fields.ok) return fields;
  return { ok: true, data: { ...fields.data, online: formData.get("online") === "true" } };
}

export async function createStorefront(_prev: FormState, formData: FormData): Promise<FormState> {
  const payload = storefrontPayloadFrom(formData);
  if (!payload.ok) return toFormState(payload, "");

  const result = await dashboardRequest<Storefront>("/storefronts", {
    method: "POST",
    headers: JSON_HEADERS,
    body: JSON.stringify(payload.data),
  });

  if (result.ok) revalidatePath(PATH, "page");
  return toFormState(result, "Sucursal creada.");
}

export async function updateStorefront(id: string, _prev: FormState, formData: FormData): Promise<FormState> {
  const payload = storefrontPayloadFrom(formData);
  if (!payload.ok) return toFormState(payload, "");

  const result = await dashboardRequest<Storefront>(`/storefronts/${id}`, {
    method: "PATCH",
    headers: JSON_HEADERS,
    body: JSON.stringify({ ...payload.data, active: formData.get("active") === "true" }),
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
  const payload = parseOrError(pointProgramCreateSchema, {
    ...Object.fromEntries(formData),
    storefrontIds: formData.getAll("storefrontIds"),
  });
  if (!payload.ok) return toFormState(payload, "");

  const result = await dashboardRequest<PointProgram>("/point-programs", {
    method: "POST",
    headers: JSON_HEADERS,
    body: JSON.stringify(payload.data satisfies PointProgramCreateRequest),
  });

  if (result.ok) revalidatePath(PATH, "page");
  return toFormState(result, "Programa de puntos creado.");
}

export async function updatePointProgram(id: string, _prev: FormState, formData: FormData): Promise<FormState> {
  const payload = pointProgramUpdatePayloadFrom(formData);
  if (!payload.ok) return { message: payload.error, status: "error" };

  const storefrontIds = parseOrError(z.object({ selected: storefrontIdsSchema, original: storefrontIdsSchema }), {
    selected: formData.getAll("storefrontIds"),
    original: String(formData.get("originalStorefrontIds") ?? "").split(",").filter(Boolean),
  });
  if (!storefrontIds.ok) return toFormState(storefrontIds, "");

  const selected = new Set(storefrontIds.data.selected);
  const original = new Set(storefrontIds.data.original);
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
