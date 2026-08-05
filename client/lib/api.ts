import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { ApiError } from "@/lib/api-error";

export async function apiFetch(
  path: string,
  options: RequestInit = {},
  { redirectTo, tokenKey }: { redirectTo: string; tokenKey: string } = { redirectTo: "/login", tokenKey: "customer_token" },
) {
  const cookiesStore = await cookies();
  const token = cookiesStore.get(tokenKey)?.value;

  const backendUrl = process.env.BACKEND_URL ?? "http://localhost:8080";
  const res = await fetch(`${backendUrl}${path}`, {
    ...options,
    headers: { ...options.headers, Authorization: `Bearer ${token}` },
  });
  if (res.status === 401) {
    cookiesStore.delete("customer_token");
    cookiesStore.delete("employee_token");
    redirect(redirectTo);
  }

  if (!res.ok) {
    console.log({ res });
    const error = (await res.json()) as { error: string; code?: string; customerId?: string };
    throw new ApiError(error.error, { code: error.code, customerId: error.customerId });
  }
  return res;
}
