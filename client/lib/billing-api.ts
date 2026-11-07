import "server-only";
import { z } from "zod";
import { ActionResult, backendFetch } from "./api";

const BILLING_MESSAGES = {
  byStatus: {
    401: "Tu sesión terminó. Volvé a ingresar a tu negocio.",
    403: "Necesitás una cuenta administradora de este negocio.",
    409: "El estado cambió o hay otra operación en curso. Reintentá la consulta antes de continuar.",
  },
  failed: "No pudimos completar la solicitud. Reintentá la consulta en un momento.",
  invalid: "No pudimos verificar la información del servicio. Reintentá la consulta.",
  // Mutations can have succeeded upstream even when their response was lost.
  unavailable: "No pudimos confirmar la respuesta del servicio. Reintentá la consulta antes de repetir la operación.",
};

// Explicit verified token; unlike dashboardRequest, this never redirects on missing auth.
export async function billingRequest<T>(token: string, path: string, schema: z.ZodType<T>, init?: RequestInit): Promise<ActionResult<T>> {
  if (!token) return { ok: false, status: 401, error: "Volvé a ingresar con la cuenta que administra el negocio." };

  return backendFetch(path, { ...init, cache: "no-store", redirect: "error" }, {
    token,
    schema,
    timeoutMs: 15_000,
    messages: BILLING_MESSAGES,
  });
}
