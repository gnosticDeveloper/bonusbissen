import RewardsList from "@/components/rewards-list";
import { getRewards } from "./actions";
import { CreateRewardButton } from "@/components/create-reward-button";
import { getCurrentUser } from "../actions";
import { UserRole } from "@/lib/definitions";

export default async function RewardsPage({ searchParams }: { searchParams: Promise<{ [key: string]: string | undefined }> }) {
  const { query } = await searchParams;

  const [rewardsResult, currentUser] = await Promise.all([getRewards(query), getCurrentUser()]);
  const isAdmin = currentUser.ok && currentUser.data.role.toUpperCase() === UserRole.ADMIN;
  const rewards = rewardsResult.ok ? rewardsResult.data : [];

  return (
    <div className="flex h-full flex-col gap-4">
      <div className="flex flex-col lg:flex-row items-center justify-between gap-2">
        <div className="flex flex-col">
          <h2 className="text-lg font-semibold">Recompensas</h2>
          <p className="text-sm text-muted-foreground">
            {isAdmin
              ? "Creá, editá y eliminá las recompensas que tus clientes pueden canjear."
              : "Catálogo de recompensas disponibles (solo lectura)."}
          </p>
        </div>
        {isAdmin ? <CreateRewardButton /> : null}
      </div>

      <RewardsList rewards={rewards} isAdmin={isAdmin} />
    </div>
  );
}
