import Link from "next/link";
import { LogoTile } from "@/components/logo-tile";
import { formatNumber } from "@/lib/helpers/format";
import type { StorefrontDiscoverInfo } from "@/lib/types/storefront";
import { storefrontLogoUrl } from "./storefront-logo-url";

const pillClass =
  "inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full bg-brand/20 px-3.5 text-sm font-bold whitespace-nowrap tabular-nums text-brand-ink";

/** The slim header of the inner storefront pages: who you're at, and your balance there. */
export function CompactHeader({
  storefront,
  points,
  pointLabel,
  balanceHref,
}: {
  storefront: StorefrontDiscoverInfo;
  points: number | null;
  pointLabel: string;
  /** Turns the balance into a link (e.g. to the history). */
  balanceHref?: string;
}) {
  const balance = points !== null && (
    <>
      <span aria-hidden="true" className="size-2 rounded-full bg-current" />
      {formatNumber(points)} {pointLabel}
    </>
  );

  return (
    <header className="flex min-h-11 items-center justify-between gap-3">
      <div className="flex min-w-0 items-center gap-2.5">
        <LogoTile src={storefrontLogoUrl(storefront)} name={storefront.orgName} className="size-8 rounded-[9px] text-sm" />
        <span className="truncate text-[15px] font-semibold text-foreground/75">{storefront.orgName}</span>
      </div>

      {points !== null &&
        (balanceHref ? (
          <Link
            href={balanceHref}
            aria-label={`Tenés ${formatNumber(points)} ${pointLabel}. Ver historial`}
            className={`${pillClass} transition-colors hover:bg-brand/30 focus-visible:outline-2 focus-visible:outline-foreground/70`}
          >
            {balance}
          </Link>
        ) : (
          <span className={pillClass}>{balance}</span>
        ))}
    </header>
  );
}
