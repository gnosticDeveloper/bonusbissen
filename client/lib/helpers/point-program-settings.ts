import type { PointProgramUpdateRequest } from "../types/point-program";

export const POINT_EXPIRATION_MONTHS = [3, 6, 9, 12] as const;

type UpdatePayloadResult =
  | { ok: true; data: PointProgramUpdateRequest }
  | { ok: false; error: string };

export function pointProgramUpdatePayloadFrom(formData: FormData): UpdatePayloadResult {
  const name = formData.get("name");
  if (typeof name !== "string" || !name.trim()) {
    return { ok: false, error: "Ingresá el nombre del programa." };
  }

  const expirationValues = formData.getAll("expirationMonths");
  const expirationValue = expirationValues[0];
  const expirationMonths = expirationValue === "none"
    ? null
    : POINT_EXPIRATION_MONTHS.find((months) => String(months) === expirationValue);

  // Missing or invalid values must not silently disable expiration on PATCH.
  if (expirationValues.length !== 1 || expirationMonths === undefined) {
    return { ok: false, error: "Elegí sin vencimiento o un plazo de 3, 6, 9 o 12 meses." };
  }

  const unitLabel = formData.get("unitLabel");
  return {
    ok: true,
    data: {
      name: name.trim(),
      unitLabel: typeof unitLabel === "string" ? unitLabel || undefined : undefined,
      active: formData.get("active") === "true",
      expirationMonths,
    },
  };
}
