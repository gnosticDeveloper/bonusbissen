import { Gift } from "lucide-react";
import { getRewards } from "./actions";
import { MemberOnlyRewardCard } from "@/components/member-only-reward-card";
import { EmptyState } from "@/components/empty-state";
import { ErrorState } from "@/components/error-state";
import { SearchParamsPaginationControls } from "@/components/search-params-pagination-controls";

export default async function MemberOnlyRewardsPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ page?: string }>;
}) {
  const { slug: storefrontId } = await params;
  const { page: pageParam } = await searchParams;
  const page = Math.max(0, Number(pageParam) || 0);

  const result = await getRewards(storefrontId, { page });

  const header = (
    <header className="mb-6">
      <h1 className="text-xl font-medium text-foreground">Recompensas</h1>
      <p className="mt-1 text-sm text-foreground/75">Canjeá tus puntos por estas recompensas.</p>
    </header>
  );

  if (!result.ok) {
    return (
      <main className="mx-auto flex w-full max-w-107.5 flex-col px-4 pt-6">
        {header}
        <ErrorState icon={Gift} title="No pudimos cargar las recompensas" />
      </main>
    );
  }

  const rewards = result.data.items.filter((reward) => reward.active);
  const { totalPages } = result.data;

  return (
    <main className="mx-auto flex w-full max-w-107.5 flex-col px-4 pt-6">
      {header}

      {rewards.length === 0 ? (
        <EmptyState icon={Gift} title="Todavía no hay recompensas disponibles" description="Este negocio va a cargar recompensas pronto." />
      ) : (
        <ul className="flex flex-col gap-3">
          {rewards.map((reward) => (
            <li key={reward.id}>
              <MemberOnlyRewardCard reward={reward} />
            </li>
          ))}
        </ul>
      )}

      {totalPages > 1 && <SearchParamsPaginationControls page={page} totalPages={totalPages} />}
    </main>
  );
}
