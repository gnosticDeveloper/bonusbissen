import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export async function apiFetch(
  path: string,
  options: RequestInit = {},
  { redirectTo, tokenKey }: { redirectTo: string; tokenKey: string } = { redirectTo: "/login", tokenKey: "customer_token" },
) {
  const cookiesStore = await cookies();
  const token = cookiesStore.get(tokenKey)?.value;

  const res = await fetch(`http://localhost:8080${path}`, {
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
    const error = (await res.json()) as { error: string };
    throw new Error(error.error);
  }
  return res;
}
