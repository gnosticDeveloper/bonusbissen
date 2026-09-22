import { Spinner } from "@/components/spinner";
import { Business } from "@/lib/definitions";
import { RewardCard } from "./reward-card";
import { formatPoints } from "@/lib/helpers/format";
import { Carousel } from "./carousel";
import Link from "next/link";
import { resolveAssetUrl } from "@/lib/helpers/assets";

interface BusinessListProps {
  businesses: Business[];
  loading: boolean;
  error: boolean;
  emptyMessage?: string;
}

export function BusinessList({ businesses, loading, error, emptyMessage = "Parece que no hay negocios cerca :(" }: BusinessListProps) {
  if (loading) {
    return (
      <section className="flex min-h-28 items-center justify-center gap-2.5 text-xs text-muted">
        <Spinner />
        <span>Buscando negocios...</span>
      </section>
    );
  }

  if (error || businesses.length === 0) {
    return <section className="mx-5 rounded-2xl border border-dashed border-border px-3 py-5 text-center text-xs text-muted">{emptyMessage}</section>;
  }

  return (
    <section className="grid gap-7">
      {businesses.map((storefront) => {
        const rewards = storefront.rewards.map((reward) => ({
          ...reward,
          imagePath: resolveAssetUrl(reward.imagePath),
        }));

        return (
          <article key={storefront.id} className="overflow-hidden border-b border-border bg-background pb-7">
            <header className="flex items-center gap-3 px-5 pb-3">
              <div
                className="grid size-10 shrink-0 place-items-center overflow-hidden rounded-full border border-border bg-card text-base font-semibold text-foreground"
                style={{ borderColor: `${storefront.color}55` }}
              >
                {storefront.logoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={storefront.logoUrl} alt="" className="size-full object-cover" />
                ) : (
                  storefront.name.charAt(0).toUpperCase()
                )}
              </div>

              <div className="min-w-0 flex-1">
                <h3 className="truncate text-sm font-semibold tracking-[-0.02em] text-foreground">{storefront.name}</h3>
                <p className="truncate text-[11px] text-muted">
                  {storefront.address.street} · {storefront.address.city}
                </p>
              </div>

              <Link
                href={`/s/${storefront.id}/afiliarse`}
                className="shrink-0 rounded-full border border-border bg-card px-3 py-1.5 text-[11px] font-semibold text-foreground transition-colors hover:border-primary hover:text-primary"
              >
                Unirse
              </Link>
            </header>

            <Carousel
              className="w-full"
              items={rewards}
              renderItem={(reward) => <RewardCard reward={reward} pointsLabel={storefront.pointLabel} color={storefront.color} />}
            />

            <div className="px-5 pt-3">
              <p className="line-clamp-2 text-xs leading-5 text-muted">{storefront.description}</p>

              <div className="mt-3 flex items-center justify-between gap-3 text-[11px]">
                <span className="truncate text-muted">{storefront.category}</span>
                <strong className="shrink-0 font-semibold" style={{ color: storefront.color }}>
                  {formatPoints(storefront.points)} {storefront.pointLabel}
                </strong>
              </div>
            </div>
          </article>
        );
      })}

      {businesses.length >= 1 && businesses.length <= 9 ? (
        <footer className="w-full flex flex-col items-center relative pt-20">
          <span className="text-muted relative text-xs text-center bg-background z-30 text-shadow-lg shadow-black">
            llegaste al final de la lista (￣o￣) . z Z
          </span>
          <img src="/final.png" alt="little sleepy cat" className="absolute -top-1.75 w-auto h-50 grayscale" />
        </footer>
      ) : null}
    </section>
  );
}
