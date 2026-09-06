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
      <section className="business-loading">
        <Spinner />
        <span>Buscando negocios... :)</span>
      </section>
    );
  if (error || businesses.length === 0) return <section className="business-empty h-full">Parece que no hay negocios cerca :(</section>;
  return (
    <section className="business-list">
      {businesses.map((business) => {
        const index = rewardIndexes[business.id] ?? 0;
        const reward = business.rewards[index % business.rewards.length];
        return (
          <article className="business-card" style={{ backgroundColor: business.color }} key={business.id}>
            <div
              className="business-image"
              style={{ backgroundImage: `linear-gradient(180deg, transparent 45%, ${business.color} 100%), url(${business.logoUrl})` }}
            />
            <div className="business-content">
              <div className="business-heading">
                <div className="business-logo">{business.name.charAt(0)}</div>
                <div>
                  <p className="business-category">{business.category}</p>
                  <h3>{business.name}</h3>
                </div>
                <ChevronRight className="card-arrow" size={19} />
              </div>
              <p className="business-description">{business.description}</p>
              <div className="reward-slider">
                <button
                  aria-label="Recompensa anterior"
                  onClick={() =>
                    setRewardIndexes((state) => ({ ...state, [business.id]: (index - 1 + business.rewards.length) % business.rewards.length }))
                  }
                >
                  <ChevronLeft size={14} />
                </button>
                <RewardCard reward={reward} color={business.color} />
                <button
                  aria-label="Siguiente recompensa"
                  onClick={() => setRewardIndexes((state) => ({ ...state, [business.id]: (index + 1) % business.rewards.length }))}
                >
                  <ChevronRight size={14} />
                </button>
              </div>
              <div className="business-footer">
                <span>
                  <MapPin size={12} /> {business.address.street} • Palermo
                </span>
                <strong>
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
