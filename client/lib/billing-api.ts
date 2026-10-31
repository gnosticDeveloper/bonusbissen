import "server-only";
import { z } from "zod";
import type { BillingResult } from "./billing";

// Explicit verified token; unlike dashboardRequest, this never redirects on missing auth.
export async function billingRequest<T>(token: string, path: string, schema: z.ZodType<T>, init?: RequestInit): Promise<BillingResult<T>> {
  if (!token) return { ok: false, status: 401, error: "Volvé a ingresar como administrador desde Organización." };
  try {
    const response = await fetch(`${process.env.BACKEND_URL ?? "http://localhost:8080"}${path}`, {
      ...init, headers: { ...init?.headers, Authorization: `Bearer ${token}` },
      cache: "no-store", redirect: "error", signal: AbortSignal.timeout(15_000),
    });
    if (!response.ok) {
      const error = response.status === 401 ? "Tu sesión venció. Volvé a ingresar desde Organización."
        : response.status === 403 ? "Necesitás una cuenta administradora de este negocio."
        : response.status === 409 ? "El estado cambió o hay otra operación en curso. Reintentá la consulta antes de continuar."
        : "No pudimos completar la solicitud. Reintentá la consulta en un momento.";
      return { ok: false, status: response.status, error };
    }
    const parsed = schema.safeParse(await response.json());
    return parsed.success ? { ok: true, data: parsed.data } : { ok: false, error: "No pudimos verificar la información del servicio. Reintentá la consulta." };
  } catch {
    // Mutations can have succeeded upstream even when their response was lost.
    return { ok: false, error: "No pudimos confirmar la respuesta del servicio. Reintentá la consulta antes de repetir la operación." };
  }
}
