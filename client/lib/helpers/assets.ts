const ASSETS_URL = process.env.NEXT_PUBLIC_ASSETS_URL ?? "http://localhost:8080/uploads";

export function resolveAssetUrl(path?: string | null): string | null {
  return path ? `${ASSETS_URL}/${path}` : null;
}
