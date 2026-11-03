/**
 * Single source for the server-only backend origin. `BACKEND_URL` must never be
 * read in browser code: it is not a `NEXT_PUBLIC_` variable.
 */
export function backendUrl(path = ""): string {
  return `${process.env.BACKEND_URL ?? "http://localhost:8080"}${path}`;
}
