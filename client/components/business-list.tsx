"use client";

import { Spinner } from "@/components/spinner";
import { NearbyBusiness } from "@/lib/definitions";
import { ChevronLeft, ChevronRight, MapPin } from "lucide-react";
import { useState } from "react";
import { RewardCard } from "./reward-card";
import { formatPoints } from "@/lib/helpers/format";

export function BusinessList({ businesses, loading, error }: { businesses: NearbyBusiness[]; loading: boolean; error: boolean }) {
  const [rewardIndexes, setRewardIndexes] = useState<Record<string, number>>({});

  if (loading)
    return (
      <section className="flex min-h-27.5 items-center justify-center gap-2.25 text-xs text-muted">
        <Spinner />
        <span>Buscando negocios... :)</span>
      </section>
    );

  if (error || businesses.length === 0)
    return (
      <section className="h-full rounded-xl border border-dashed border-border px-2.5 py-3.5 text-center text-xs text-muted">
        Parece que no hay negocios cerca :(
      </section>
    );

  return (
    <section className="relative z-1 grid gap-4">
      {businesses.map((business) => {
        const index = rewardIndexes[business.id] ?? 0;
        const reward = business.rewards[index % business.rewards.length];
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
                <div>
                  <p className="m-0 mb-0.5 text-[9px] font-bold tracking-[0.09em] text-white/70 uppercase">{business.category}</p>
                  <h3 className="m-0 text-xl tracking-[-0.6px]">{business.name}</h3>
                </div>
                <ChevronRight className="ml-auto opacity-80" size={19} />
              </div>

              <p className="mt-2.5 mb-3 max-w-57.5 text-[11px] leading-[1.4] text-white/86">{business.description}</p>

              <div className="flex items-center gap-1.25">
                <button
                  aria-label="Recompensa anterior"
                  onClick={() =>
                    setRewardIndexes((state) => ({
                      ...state,
                      [business.id]: (index - 1 + business.rewards.length) % business.rewards.length,
                    }))
                  }
                  className="grid h-6 w-6 shrink-0 place-items-center rounded-full border border-white/25 bg-black/9 text-white"
                >
                  <ChevronLeft size={14} />
                </button>
                <RewardCard reward={reward} color={business.color} />
                <button
                  aria-label="Siguiente recompensa"
                  onClick={() => setRewardIndexes((state) => ({ ...state, [business.id]: (index + 1) % business.rewards.length }))}
                  className="grid h-6 w-6 shrink-0 place-items-center rounded-full border border-white/25 bg-black/9 text-white"
                >
                  <ChevronRight size={14} />
                </button>
              </div>

              <div className="relative z-1 mt-3.75 flex items-center justify-between gap-1.5 text-[9px] text-white/73">
                <span className="flex items-center gap-1">
                  <MapPin size={12} /> {business.address.street} • Palermo
                </span>
                <strong className="text-[11px] whitespace-nowrap text-white">
                  {formatPoints(business.points)} · {business.pointLabel}
                </strong>
              </div>
            </div>
          </article>
        );
      })}
    </section>
  );
}
