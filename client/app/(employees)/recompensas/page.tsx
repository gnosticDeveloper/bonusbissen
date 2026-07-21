import { getRewards } from "@/app/rewards.actions";
import CreateRewardForm from "@/components/recompensas/create-reward-form";
import RewardsList from "@/components/recompensas/rewards-list";

export default async function RecompensasPage({ searchParams }: { searchParams: Promise<{ [key: string]: string | string[] | undefined }> }) {
  const query = (await searchParams).query;

  const rewards = await getRewards(query);
  return (
    <div className="grid grid-cols-3 gap-8 h-full">
      <div className="col-span-2 flex flex-col gap-6 min-h-0">
        <header>
          <h2 className="text-4xl font-bold text-ink">Recompensas</h2>
          <p className="text-xl text-ink-soft mt-2">Estas son las recompensas que los clientes pueden canjear con sus puntos.</p>
        </header>

        <RewardsList rewards={rewards} />
      </div>

      <CreateRewardForm />
    </div>
  );
}
