import { Gift, RotateCcw } from "lucide-react";
import { getRewards } from "./actions";
import { MemberOnlyRewardCard } from "@/components/member-only-reward-card";
import { EmptyRewardsState } from "@/components/empty-reward-state";

export default async function MemberOnlyRewardsPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug: storefrontId } = await params;

  // TODO: the controller should filter by storefrontId.
  const result = await getRewards(storefrontId);

  if (!result.ok) {
    return (
      <main className="mx-auto flex min-h-svh w-full max-w-107.5 flex-col px-4 pb-12 pt-6">
        <header className="mb-6">
          <h1 className="text-xl font-medium text-foreground">Recompensas</h1>
          <p className="mt-1 text-sm text-muted">Canjeá tus puntos por estas recompensas.</p>
        </header>

        <div className="rounded-3xl border border-border bg-card px-6 py-10 text-center shadow-[0_16px_40px_rgba(20,16,25,0.06)]">
          <div className="mx-auto mb-4 grid h-12 w-12 place-items-center rounded-2xl bg-primary/10 text-primary">
            <Gift className="h-6 w-6" aria-hidden="true" />
          </div>

          <p className="text-sm font-semibold text-foreground">No pudimos cargar las recompensas</p>

          <p className="mx-auto mt-2 max-w-55 text-xs leading-5 text-muted-foreground">Probá de nuevo en un rato.</p>

          <div className="mx-auto mt-5 flex w-fit items-center gap-2 rounded-full border border-border bg-background px-3 py-1.5 text-[11px] font-medium text-muted-foreground">
            <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
            Reintentar más tarde
          </div>
        </div>
      </main>
    );
  }

  const rewards = result.data.filter((reward) => reward.active);

  return (
    <main className="mx-auto flex min-h-svh w-full max-w-107.5 flex-col px-4 pb-12 pt-6">
      <header className="mb-6">
        <h1 className="text-xl font-medium text-foreground">Recompensas</h1>
        <p className="mt-1 text-sm text-muted">Canjeá tus puntos por estas recompensas.</p>
      </header>

      {rewards.length === 0 ? (
        <EmptyRewardsState />
      ) : (
        <ul className="flex flex-col gap-3">
          {rewards.map((reward) => (
            <li key={reward.id}>
              <MemberOnlyRewardCard reward={reward} />
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
