import { resolveAssetUrl } from "@/lib/helpers/assets";
import type { StorefrontDiscoverInfo } from "@/lib/types/storefront";

/** The organization logo, else the storefront's own icon. */
export function storefrontLogoUrl(storefront: Pick<StorefrontDiscoverInfo, "orgLogoUrl" | "iconUrl">): string | null {
  return storefront.orgLogoUrl ?? resolveAssetUrl(storefront.iconUrl);
}
