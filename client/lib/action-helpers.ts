import type { z } from "zod";
import type { ActionResult } from "@/lib/api";

const INVALID_INPUT_MESSAGE = "Revisá los datos ingresados.";

/**
 * Validates `input` against `schema`. On failure, the error is the first
 * issue's message. A check without its own message (e.g. a missing field)
 * gets the generic Spanish one instead of Zod's English default.
 */
export function parseOrError<S extends z.ZodType>(schema: S, input: unknown): ActionResult<z.output<S>> {
  const parsed = schema.safeParse(input, { error: () => INVALID_INPUT_MESSAGE });
  if (parsed.success) return { ok: true, data: parsed.data };
  return { ok: false, error: parsed.error.issues[0]?.message ?? INVALID_INPUT_MESSAGE };
}

/** Mercado Pago authorized the recurring charges. This is not proof that an invoice was paid. */
export function isBillingAuthorized(organization: { mercadoPagoSubscriptionStatus?: string | null } | null | undefined): boolean {
  return organization?.mercadoPagoSubscriptionStatus === "authorized";
}
