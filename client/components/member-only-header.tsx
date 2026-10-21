import { resolveAssetUrl } from "@/lib/helpers/assets";
import type { StorefrontDiscoverInfo } from "@/lib/types/storefront";

export function MemberOnlyHeader({ storefront }: { storefront: StorefrontDiscoverInfo }) {
  const logoUrl = storefront.orgLogoUrl ?? resolveAssetUrl(storefront.iconUrl);

  return (
    <header className="bg-background text-center">
      <div className="relative h-40 w-full overflow-hidden bg-card sm:h-48">
        {storefront.orgBannerUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={storefront.orgBannerUrl} alt={`Portada de ${storefront.orgName}`} className="size-full object-cover" />
        ) : (
          <div
            className="size-full"
            style={{ background: storefront.color }}
          />
        )}
      </div>

      <div className="relative mx-auto max-w-107.5 px-5 pb-5">
        <div className="mx-auto -mt-13 grid size-26 place-items-center overflow-hidden rounded-2xl border-4 border-background bg-card text-4xl font-bold text-foreground shadow-lg">
          {logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={logoUrl} alt={`Logo de ${storefront.orgName}`} className="size-full object-cover" />
          ) : (
            storefront.orgName.charAt(0).toUpperCase()
          )}
        </div>
        <h1 className="mt-3 wrap-break-word text-2xl font-bold leading-tight text-foreground">{storefront.orgName}</h1>
        <p className="mt-1 text-sm text-foreground/75">{storefront.name}</p>
      </div>
    </header>
  );
}
