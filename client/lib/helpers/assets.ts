// NEXT_PUBLIC_* is required here, not plain ASSETS_URL -- this helper is called
// from both Server and Client Components (e.g. business-list.tsx, used by the
// client-rendered /b page), and only NEXT_PUBLIC_* vars are readable from code
// that ends up running in the browser. Baked in at build time (see client/Dockerfile).
export function resolveAssetUrl(path?: string | null): string | null {
  const assetsUrl = process.env.NEXT_PUBLIC_ASSETS_URL ?? "http://localhost:8080/uploads/";
  return path ? `${assetsUrl}${path}` : null;
}
