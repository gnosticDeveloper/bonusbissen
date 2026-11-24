/** Only same-app relative paths are followed after signing in. */
export function safeReturnTo(value: string | null): string | null {
  if (!value || !value.startsWith("/") || value.startsWith("//")) return null;
  return value;
}

export function buildAuthQueryString(searchParams: URLSearchParams): string {
  const params = new URLSearchParams();
  const returnTo = searchParams.get("returnTo");
  const joinTo = searchParams.get("joinTo");
  if (returnTo) params.set("returnTo", returnTo);
  if (joinTo) params.set("joinTo", joinTo);
  const query = params.toString();
  return query ? `?${query}` : "";
}

/** Where to go after a customer signs in: back to the storefront they wanted to join, or home. */
export function afterAuthPath(searchParams: URLSearchParams): string {
  const joinTo = searchParams.get("joinTo");
  if (joinTo) return `/s/afiliarse?local=${encodeURIComponent(joinTo)}`;
  return safeReturnTo(searchParams.get("returnTo")) ?? "/b";
}
