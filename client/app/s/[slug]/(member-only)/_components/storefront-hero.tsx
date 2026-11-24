import { MapPin } from "lucide-react";
import { LogoTile } from "@/components/logo-tile";
import type { StorefrontDiscoverInfo } from "@/lib/types/storefront";
import { storefrontLogoUrl } from "./storefront-logo-url";

/** Banner, logo and names of the storefront home. Without a banner the brand color fills its place. */
export function StorefrontHero({ storefront, location }: { storefront: StorefrontDiscoverInfo; location: string | null }) {
  return (
    <header>
      <div className="relative h-49 w-full overflow-hidden bg-brand">
        {storefront.orgBannerUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={storefront.orgBannerUrl} alt="" className="size-full object-cover" />
        )}
        <div aria-hidden="true" className="absolute inset-0 bg-linear-to-b from-transparent from-40% to-background" />
      </div>

      <div className="relative mx-auto -mt-13 flex max-w-107.5 flex-col gap-3.5 px-5">
        <LogoTile
          src={storefrontLogoUrl(storefront)}
          name={storefront.orgName}
          alt={`Logo de ${storefront.orgName}`}
          className="size-21 rounded-[22px] border-4 border-background text-3xl shadow-lg"
        />

        <div className="flex flex-col gap-1">
          <h1 className="wrap-break-word text-[30px] leading-tight font-bold tracking-[-0.02em] text-foreground">{storefront.orgName}</h1>
          <p className="text-[15px] text-foreground/75">{storefront.name}</p>
        </div>

        {location && (
          <ul className="flex flex-wrap gap-2" aria-label="Datos del local">
            <li className="inline-flex h-8 items-center gap-1.5 rounded-full border border-border bg-card px-3 text-[13px] font-semibold text-foreground/85">
              <MapPin size={15} aria-hidden="true" />
              {location}
            </li>
          </ul>
        )}
      </div>
    </header>
  );
}
