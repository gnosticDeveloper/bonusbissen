"use server";

import { ActionResult, backendFetch, backendFetchWithResponse, REQUEST_FAILED_MESSAGE } from "@/lib/api";
import { SignInUser } from "@/lib/types/user";
import { sessionTokenSchema, userLoginSchema } from "@/schemas/user";
import { saveSession } from "@/lib/auth/refresh";
import { parseOrError } from "@/lib/action-helpers";
import { z } from "zod";

const JSON_HEADERS = { "Content-Type": "application/json" };
const INVALID_LINK_MESSAGE = "El enlace no es válido o venció. Pedí uno nuevo.";

export async function signIn(formData: FormData): Promise<ActionResult<SignInUser>> {
  const raw = {
    identifier: String(formData.get("identifier") ?? ""),
    password: String(formData.get("password") ?? ""),
  };

  const parsed = parseOrError(userLoginSchema, raw);
  if (!parsed.ok) return parsed;

  const { identifier, password } = parsed.data;

  const result = await backendFetchWithResponse(
    "/auth/user-login",
    { method: "POST", headers: JSON_HEADERS, body: JSON.stringify({ identifier, password }), cache: "no-store" },
    { schema: sessionTokenSchema, messages: { failed: REQUEST_FAILED_MESSAGE } },
  );
  if (!result.ok) return result;

  if (!(await saveSession("customer", result.response, result.data.token))) return { ok: false, error: "No pudimos iniciar sesión. Probá de nuevo." };
  return { ok: true, data: { name: identifier, avatarUrl: null } };
}

export async function requestLoginLink(email: string): Promise<ActionResult<null>> {
  const parsed = z.email().max(255).safeParse(typeof email === "string" ? email.trim() : "");
  if (!parsed.success) return { ok: false, error: "Ingresá un email válido." };

  const result = await backendFetch(
    "/auth/user-login-link/request",
    { method: "POST", headers: JSON_HEADERS, body: JSON.stringify({ email: parsed.data }), cache: "no-store" },
    { messages: { failed: "No pudimos enviar el enlace. Probá de nuevo." } },
  );
  if (!result.ok) return result;
  return { ok: true, data: null };
}

export async function consumeLoginLink(token: string): Promise<ActionResult<null>> {
  if (typeof token !== "string" || !/^[A-Za-z0-9_-]{43}$/.test(token)) {
    return { ok: false, error: INVALID_LINK_MESSAGE };
  }

  const result = await backendFetchWithResponse(
    "/auth/user-login-link/consume",
    { method: "POST", headers: JSON_HEADERS, body: JSON.stringify({ token }), cache: "no-store" },
    { schema: sessionTokenSchema, messages: { failed: INVALID_LINK_MESSAGE } },
  );
  if (!result.ok) return result;

  if (!(await saveSession("customer", result.response, result.data.token))) return { ok: false, error: "No pudimos iniciar sesión. Probá de nuevo." };
  return { ok: true, data: null };
}
