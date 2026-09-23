import RewardsList from "@/components/rewards-list";
import { getRewards } from "./actions";
import { CreateRewardButton } from "@/components/create-reward-button";
import { getCurrentUser } from "../actions";
import { UserRole } from "@/lib/definitions";
import { Reward } from "@/lib/types/reward";
import { resolveAssetUrl } from "@/lib/helpers/assets";
import { SearchParamsPaginationControls } from "@/components/search-params-pagination-controls";

export default async function RewardsPage({ searchParams }: { searchParams: Promise<{ [key: string]: string | undefined }> }) {
  const { query, page: pageParam } = await searchParams;
  const page = Math.max(0, Number(pageParam) || 0);

  const [rewardsResult, currentUser] = await Promise.all([getRewards(query, { page }), getCurrentUser()]);
  const isAdmin = currentUser.ok && currentUser.data.role.toUpperCase() === UserRole.ADMIN;
  const rewards = rewardsResult.ok ? rewardsResult.data.items : [];
  const totalPages = rewardsResult.ok ? rewardsResult.data.totalPages : 0;

  const transformedRewardsWithCompleteImagePath = rewards.map((r) => ({
    ...r,
    imagePath: r.imagePath ? (process.env.ASSETS_URL ?? "http://localhost:8080/uploads/") + r.imagePath : null,
  }));

  return (
    <div className="flex h-full flex-col gap-4">
      <div className="flex flex-col lg:flex-row items-center justify-between gap-2">
        <header className="mb-7">
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">Gestión</p>
          <h1 className="text-3xl font-semibold tracking-tighter sm:text-4xl">Recompensas</h1>
          <p className="mt-2 text-sm leading-6 text-muted">
            {isAdmin
              ? "Creá, editá y eliminá las recompensas que tus clientes pueden canjear."
              : "Catálogo de recompensas disponibles (solo lectura)."}
          </p>
        </header>
        {isAdmin ? <CreateRewardButton /> : null}
      </div>
      {totalPages > 1 && <SearchParamsPaginationControls page={page} totalPages={totalPages} />}

      <RewardsList rewards={transformedRewardsWithCompleteImagePath} isAdmin={isAdmin} />
    </div>
  );
}
