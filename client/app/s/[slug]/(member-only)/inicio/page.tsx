import Link from "next/link";
import { ChevronRight, Gift } from "lucide-react";
import { ErrorState } from "@/components/error-state";
import { overviewRewards } from "@/lib/helpers/reward-progress";
import { getStorefrontDiscoverInfo } from "../../afiliarse/actions";
import { getStorefrontRewards } from "../recompensas/actions";
import { PointsHeroCard } from "../_components/points-hero-card";
import { RewardRail } from "../_components/reward-rail";
import { StorefrontAbout } from "../_components/storefront-about";
import { StorefrontHero } from "../_components/storefront-hero";
import { getBusinessByStorefrontId, getMemberPoints } from "./actions";

const RAIL_SIZE = 6;

function joinParts(parts: (string | null | undefined)[]): string | null {
  const text = parts.filter(Boolean).join(", ");
  return text || null;
}

export default async function MemberOnlyHomePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug: storefrontId } = await params;
  const [storefront, businessResult, pointsResult, rewardsResult] = await Promise.all([
    getStorefrontDiscoverInfo(storefrontId),
    getBusinessByStorefrontId(storefrontId),
    getMemberPoints(storefrontId),
    getStorefrontRewards(storefrontId),
  ]);

  const base = `/s/${storefrontId}`;
  const pointLabel = storefront.pointLabel ?? "puntos";
  const points = pointsResult.ok ? pointsResult.data.points : null;
  const overview = rewardsResult.ok ? overviewRewards(rewardsResult.data.items, points) : null;
  const business = businessResult.ok ? businessResult.data : null;
  const address = business?.address;

  return (
    <>
      <StorefrontHero storefront={storefront} location={joinParts([address?.city, address?.province])} />

      <main className="mx-auto flex w-full max-w-107.5 flex-col px-5 py-6 text-foreground">
        <PointsHeroCard
          points={points}
          pointLabel={pointLabel}
          next={overview?.next ?? null}
          allRedeemable={overview !== null && overview.all.length > 0 && overview.upcoming.length === 0 && points !== null}
          historyHref={`${base}/historial`}
        />

        {overview && overview.redeemable.length > 0 && (
          <Link
            href={`${base}/recompensas?filtro=canjeables`}
            className="mt-3 flex items-center gap-3 rounded-[18px] border border-border bg-card px-4 py-3.5 transition-colors hover:bg-foreground/5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground/70"
          >
            <span aria-hidden="true" className="grid size-10 shrink-0 place-items-center rounded-xl bg-brand/20 text-brand-ink">
              <Gift size={20} />
            </span>
            <span className="flex min-w-0 flex-1 flex-col gap-0.5">
              <span className="text-[15px] font-bold">
                {overview.redeemable.length === 1 ? "Ya podés canjear 1 recompensa" : `Ya podés canjear ${overview.redeemable.length} recompensas`}
              </span>
              <span className="text-[13px] text-foreground/75">
                Te alcanzan los {pointLabel} para {overview.redeemable.length === 1 ? "esta" : "estas"}
              </span>
            </span>
            <ChevronRight size={18} className="shrink-0 text-foreground/60" aria-hidden="true" />
          </Link>
        )}

        <section aria-labelledby="home-rewards-title" className="mt-8 flex flex-col gap-3.5">
          <div className="flex items-baseline justify-between gap-3">
            <h2 id="home-rewards-title" className="text-[22px] font-bold tracking-[-0.01em]">
              Recompensas
            </h2>
            {rewardsResult.ok && rewardsResult.data.totalElements > 0 && (
              <Link
                href={`${base}/recompensas`}
                className="rounded-md py-2.5 text-[15px] font-bold text-brand-ink hover:underline focus-visible:outline-2 focus-visible:outline-foreground/70"
              >
                Ver todas ({rewardsResult.data.totalElements})
              </Link>
            )}
          </div>

          {!overview ? (
            <ErrorState icon={Gift} title="No pudimos cargar las recompensas" />
          ) : overview.all.length === 0 ? (
            <p className="rounded-[20px] border border-dashed border-border p-6 text-center text-sm text-foreground/75">Todavía no hay recompensas cargadas.</p>
          ) : (
            <RewardRail rewards={overview.all.slice(0, RAIL_SIZE)} points={points} pointLabel={pointLabel} brandColor={storefront.color} />
          )}
        </section>

        <div className="mt-9">
          {business ? (
            <StorefrontAbout description={business.description || null} address={joinParts([address?.street, address?.city, address?.province])} />
          ) : (
            <ErrorState title="No pudimos cargar la información del local" />
          )}
        </div>
      </main>
    </>
  );
}
