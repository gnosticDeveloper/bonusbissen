import { Search } from "lucide-react";
import RewardCard from "./reward-card";
import Form from "next/form";
import { Reward } from "@/lib/definitions";

export default function RewardsList({ rewards }: { rewards: Reward[] }) {
  return (
    <div className="flex flex-col gap-6 min-h-0">
      <Form action="/recompensas" className="flex gap-3">
        <input
          name="query"
          type="text"
          placeholder="Buscar por título de la recompensa..."
          className="flex-1 rounded-xl border border-ink/15 bg-cream-dark/30 px-5 py-3 text-xl text-ink placeholder:text-ink-soft/70 outline-none focus:border-amber"
        />
        <button
          type="submit"
          className="flex items-center gap-2 rounded-xl bg-amber px-6 py-3 text-xl font-medium text-cream hover:bg-amber-dark transition-colors"
        >
          <Search className="h-5 w-5" />
          Buscar
        </button>
      </Form>

      {rewards.length === 0 ? (
        <p className="text-xl text-ink-soft">No hay recompensas todavía.</p>
      ) : (
        <div className="flex flex-col gap-4 overflow-y-auto max-h-[calc(100vh-16rem)] pr-2">
          {rewards.map((r) => (
            <RewardCard key={r.id} r={r} />
          ))}
        </div>
      )}
    </div>
  );
}
