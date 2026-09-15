import { Spinner } from "@/components/spinner";
import { Business } from "@/lib/definitions";
import { ChevronRight, MapPin } from "lucide-react";
import { RewardCard } from "./reward-card";
import { formatPoints } from "@/lib/helpers/format";
import { Carousel } from "./carousel";
import Link from "next/link";

interface BusinessListProps {
  businesses: Business[];
  loading: boolean;
  error: boolean;
  emptyMessage?: string;
}

export function BusinessList({ businesses, loading, error, emptyMessage = "Parece que no hay negocios cerca :(" }: BusinessListProps) {
  if (loading)
    return (
      <section className="flex min-h-27.5 items-center justify-center gap-2.25 text-xs text-muted">
        <Spinner />
        <span>Buscando negocios... :)</span>
      </section>
    );

  if (error || businesses.length === 0)
    return (
      <section className="h-full rounded-xl border border-dashed border-border px-2.5 py-3.5 text-center text-xs text-muted">{emptyMessage}</section>
    );

  return (
    <section className="relative z-1 grid gap-4">
      {businesses.map((business) => {
        return (
          <article
            className="relative min-h-62.5 overflow-hidden rounded-[22px] text-white shadow-[0_14px_28px_#1b152015]"
            style={{ backgroundColor: business.color }}
            key={business.id}
          >
            <div
              className="absolute inset-x-0 top-0 h-41 bg-cover bg-center opacity-95"
              style={{ backgroundImage: `linear-gradient(180deg, transparent 45%, ${business.color} 100%), url(${business.logoUrl})` }}
            />
            <div className="relative flex min-h-62.5 flex-col justify-end px-4.25 pt-5.5 pb-4 bg-[linear-gradient(180deg,transparent_20%,#00000022_48%,#00000055_100%)]">
              <div className="relative z-1 flex items-center gap-2.5">
                <div className="grid h-8.75 w-8.75 shrink-0 place-items-center rounded-[11px] border border-white/50 bg-white/13 font-serif text-lg font-bold text-white">
                  {business.name.charAt(0)}
                </div>
                <div className="flex-1">
                  <p className="m-0 mb-0.5 text-[9px] font-bold tracking-[0.09em] text-white/70 uppercase">{business.category}</p>
                  <h3 className="m-0 text-xl tracking-[-0.6px]">{business.name}</h3>
                </div>
                <Link
                  href={`/s/${business.id}/discover`}
                  className="flex justify-center items-center gap-x-1 rounded-full border border-white/20 bg-black/15 text-white transition-opacity hover:bg-black/25 py-1 px-3"
                >
                  <span className="text-lg">Ver más</span>
                  <ChevronRight className="ml-auto opacity-80" size={19} />
                </Link>
              </div>

              <p className="mt-2.5 mb-3 max-w-57.5 text-[11px] leading-[1.4] text-white/86">{business.description}</p>

              <div className="flex items-center gap-1.25">
                <Carousel
                  items={business.rewards}
                  renderItem={(reward) => <RewardCard pointsLabel={business.pointLabel} reward={reward} color={business.color} />}
                />
              </div>

              <div className="relative z-1 mt-3.75 flex items-center justify-between gap-1.5 text-sm text-white/73">
                <span className="flex items-center gap-1">
                  <MapPin size={16} /> {business.address.street} • Palermo
                </span>
                <strong className="whitespace-nowrap text-white">
                  {formatPoints(business.points)} {business.pointLabel}
                </strong>
              </div>
            </div>
          </article>
        );
      })}
    </section>
  );
}
