import { Gift } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { ErrorState } from "@/components/error-state";
import { formatNumber } from "@/lib/helpers/format";
import { REWARD_FILTERS, filterRewards, overviewRewards, parseRewardFilter, type RewardFilter, type RewardOverview } from "@/lib/helpers/reward-progress";
import { getStorefrontDiscoverInfo } from "../../afiliarse/actions";
import { getMemberPoints } from "../inicio/actions";
import { CompactHeader } from "../_components/compact-header";
import { FilterLinks } from "../_components/filter-links";
import { RewardListCard } from "../_components/reward-list-card";
import { getStorefrontRewards } from "./actions";

function emptyCopy(filter: RewardFilter, overview: RewardOverview, pointLabel: string) {
  if (filter === "canjeables") {
    return {
      title: "Todavía no te alcanza para ninguna",
      description: overview.next ? `Seguí sumando ${pointLabel}: la más cercana es "${overview.next.title}".` : `Seguí sumando ${pointLabel}.`,
    };
  }
  if (filter === "proximas") {
    return { title: "¡Te alcanza para todas!", description: "Podés canjear cualquiera de las recompensas de este local." };
  }
  return { title: "Todavía no hay recompensas disponibles", description: "Este negocio va a cargar recompensas pronto." };
}

export default async function MemberOnlyRewardsPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ filtro?: string | string[] }>;
}) {
  const { slug: storefrontId } = await params;
  const { filtro } = await searchParams;

  const [storefront, pointsResult, rewardsResult] = await Promise.all([
    getStorefrontDiscoverInfo(storefrontId),
    getMemberPoints(storefrontId),
    getStorefrontRewards(storefrontId),
  ]);

  const base = `/s/${storefrontId}`;
  const pointLabel = storefront.pointLabel ?? "puntos";
  const points = pointsResult.ok ? pointsResult.data.points : null;
  // Without a balance, affordability is unknown: show everything and skip the filters.
  const filter = points === null ? "todas" : parseRewardFilter(filtro);

  return (
    <main className="mx-auto flex w-full max-w-107.5 flex-col gap-4 px-5 py-5 text-foreground">
      <CompactHeader storefront={storefront} points={points} pointLabel={pointLabel} balanceHref={`${base}/historial`} />

      <div className="flex flex-col gap-1">
        <h1 className="text-[30px] font-bold tracking-[-0.02em]">Recompensas</h1>
        <p className="text-[15px] text-foreground/75">Canjeá tus {pointLabel} por beneficios del local.</p>
      </div>

      {rewardsResult.ok ? (
        <RewardsList
          overview={overviewRewards(rewardsResult.data.items, points)}
          totalElements={rewardsResult.data.totalElements}
          filter={filter}
          points={points}
          pointLabel={pointLabel}
          brandColor={storefront.color}
          basePath={`${base}/recompensas`}
        />
      ) : (
        <ErrorState icon={Gift} title="No pudimos cargar las recompensas" />
      )}
    </main>
  );
}

function RewardsList({
  overview,
  totalElements,
  filter,
  points,
  pointLabel,
  brandColor,
  basePath,
}: {
  overview: RewardOverview;
  totalElements: number;
  filter: RewardFilter;
  points: number | null;
  pointLabel: string;
  brandColor: string | null;
  basePath: string;
}) {
  const shown = filterRewards(overview, filter);
  const counts: Record<RewardFilter, number> = {
    todas: overview.all.length,
    canjeables: overview.redeemable.length,
    proximas: overview.upcoming.length,
  };

  return (
    <>
      {points !== null && overview.all.length > 0 && (
        <FilterLinks
          label="Filtrar recompensas"
          basePath={basePath}
          param="filtro"
          options={REWARD_FILTERS.map((option) => ({ ...option, count: counts[option.value] }))}
          active={filter}
        />
      )}

      {shown.length === 0 ? (
        <EmptyState icon={Gift} {...emptyCopy(filter, overview, pointLabel)} />
      ) : (
        <ul className="flex flex-col gap-3">
          {shown.map((reward) => (
            <li key={reward.id}>
              <RewardListCard reward={reward} points={points} pointLabel={pointLabel} brandColor={brandColor} />
            </li>
          ))}
        </ul>
      )}

      {totalElements > overview.all.length && (
        <p className="text-center text-xs text-foreground/75">
          Mostrando {formatNumber(overview.all.length)} de {formatNumber(totalElements)} recompensas.
        </p>
      )}
    </>
  );
}
