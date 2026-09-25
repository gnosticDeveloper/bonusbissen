import RewardsList from "@/components/rewards-list";
import { getRewards } from "./actions";
import { CreateRewardButton } from "@/components/create-reward-button";
import { getCurrentUser } from "../actions";
import { UserRole } from "@/lib/definitions";
import { resolveAssetUrl } from "@/lib/helpers/assets";
import { SearchParamsPaginationControls } from "@/components/search-params-pagination-controls";
import { cookies } from "next/headers";
import { RewardViewToggle } from "@/components/reward-view-toggle";

export default async function RewardsPage({ searchParams }: { searchParams: Promise<{ [key: string]: string | undefined }> }) {
  const { query, page: pageParam } = await searchParams;
  const page = Math.max(0, Number(pageParam) || 0);
  const cookieStore = await cookies();
  const view = cookieStore.get("reward-view")?.value === "list" ? "list" : "grid";

  const [rewardsResult, currentUser] = await Promise.all([getRewards(query, { page }), getCurrentUser()]);

  const isAdmin = currentUser.ok && currentUser.data.role.toUpperCase() === UserRole.ADMIN;
  const rewards = rewardsResult.ok ? rewardsResult.data.items : [];
  const totalPages = rewardsResult.ok ? rewardsResult.data.totalPages : 0;

  const transformedRewards = rewards.map((reward) => ({
    ...reward,
    imagePath: reward.imagePath ? resolveAssetUrl(reward.imagePath) : null,
  }));

  return (
    <div className="flex min-h-0 h-full flex-col gap-5">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <header className="max-w-2xl">
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">Gestión</p>
          <h1 className="text-3xl font-semibold tracking-tighter sm:text-4xl">Recompensas</h1>
          <p className="mt-2 text-sm leading-6 text-muted">
            {isAdmin
              ? "Creá, editá y eliminá las recompensas que tus clientes pueden canjear."
              : "Catálogo de recompensas disponibles (solo lectura)."}
          </p>
        </header>

        <div className="flex w-full flex-col gap-3 sm:flex-row sm:items-center lg:w-auto">
          <RewardViewToggle view={view} />
          {isAdmin ? <CreateRewardButton /> : null}
        </div>
      </div>

      {totalPages > 1 ? <SearchParamsPaginationControls page={page} totalPages={totalPages} /> : null}

      <RewardsList rewards={transformedRewards} isAdmin={isAdmin} view={view} />
    </div>
  );
}
