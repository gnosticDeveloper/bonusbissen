"use server";

import { ActionResult, backendFetchWithResponse, REQUEST_FAILED_MESSAGE } from "@/lib/api";
import { SignInUser } from "@/lib/definitions";
import { sessionTokenSchema, userRegisterSchema } from "@/schemas/user";
import { saveCustomerSession } from "@/lib/auth/refresh";
import { parseOrError } from "@/lib/action-helpers";

export async function signUp(formData: FormData): Promise<ActionResult<SignInUser>> {
  const raw = {
    name: String(formData.get("name") ?? ""),
    username: String(formData.get("username") ?? ""),
    password: String(formData.get("password") ?? ""),
    email: String(formData.get("email") ?? ""),
  };

  const parsed = parseOrError(userRegisterSchema, raw);
  if (!parsed.ok) return parsed;

  const { name, username, password, email } = parsed.data;

  const result = await backendFetchWithResponse(
    "/auth/user-register",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, name, password, email }),
      cache: "no-store",
    },
    { schema: sessionTokenSchema, messages: { failed: REQUEST_FAILED_MESSAGE } },
  );
  if (!result.ok) return result;

  if (!(await saveCustomerSession(result.response, result.data.token))) return { ok: false, error: "No pudimos crear la sesión. Probá de nuevo." };
  return { ok: true, data: { name, avatarUrl: null } };
}
