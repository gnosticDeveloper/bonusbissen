import RewardsList from "@/components/rewards-list";
import { getRewards } from "./actions";
import { CreateRewardButton } from "@/components/create-reward-button";

export default async function RewardsPage({ searchParams }: { searchParams: Promise<{ [key: string]: string | undefined }> }) {
  const { query } = await searchParams;

  const rewards = await getRewards(query);

  const user = {
    name: "PLACEHOLDER",
    role: "ADMIN",
  };
  const isAdmin = user.role === "ADMIN";

  return (
    <div className="flex h-full flex-col gap-4">
      <div className="flex items-center justify-between gap-2">
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

      {/*TODO: isAdmin should be resolved from useAuth or useSession instead of doing prop drilling here. */}
      <RewardsList rewards={rewards} isAdmin={isAdmin} />
    </div>
  );
}
