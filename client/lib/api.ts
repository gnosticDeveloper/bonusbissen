import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export async function apiFetch(path: string, options: RequestInit = {}, { redirectTo, tokenKey }: { redirectTo: string, tokenKey: string } = { redirectTo: "/login", tokenKey: "customer_token" }) {
  const cookiesStore = await cookies();
  const token = cookiesStore.get(tokenKey)?.value;
  const res = await fetch(`http://localhost:8080${path}`, {
    ...options,
    headers: { ...options.headers, Authorization: `Bearer ${token}` },
  });
  if (res.status === 401) {
    cookiesStore.delete("customer_token");
    redirect(redirectTo);
  }
  return res;
}
