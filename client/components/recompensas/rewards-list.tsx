import { Search } from "lucide-react";
import RewardCard from "./reward-card";
import { getRewards } from "@/app/rewards.actions";

export default async function RewardsList() {
  // Note: this only returns active rewards. Admin employees might want to
  // see all rewards — not resolved here, needs a param once that's decided.
  const rewards = await getRewards();

  return (
    <div className="flex flex-col gap-6">
      <div className="flex gap-3">
        <input
          type="text"
          placeholder="Buscar por título de la recompensa..."
          className="flex-1 rounded-xl border border-ink/15 bg-cream-dark/30 px-5 py-3 text-xl text-ink placeholder:text-ink-soft/70 outline-none focus:border-amber"
        />
        <button
          type="button"
          className="flex items-center gap-2 rounded-xl bg-amber px-6 py-3 text-xl font-medium text-cream hover:bg-amber-dark transition-colors"
        >
          <Search className="h-5 w-5" />
          Buscar
        </button>
      </div>

      {rewards.length === 0 ? (
        <p className="text-xl text-ink-soft">No hay recompensas todavía.</p>
      ) : (
        <div className="flex flex-col gap-4">
          {rewards.map((r) => (
            <RewardCard key={r.id} r={r} />
          ))}
        </div>
      )}
    </div>
  );
}
