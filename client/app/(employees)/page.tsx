import { Gift, Clock, Users, Sparkles, ArrowUpRight } from "lucide-react";
import StatCard from "@/components/stat-card";
import PingDot from "@/components/ping-dot";
import { getHomeStats, getPendingExchanges, TopReward } from "./actions";

export default async function HomePage() {
  const [stats, pendingExchanges] = await Promise.all([
    getHomeStats(),
    // getTopRewards(),
    getPendingExchanges(),
  ]);

  const topRewards: TopReward[] = [];

  const hasPending = pendingExchanges.length > 0;

  return (
    <div className="flex flex-col gap-10">
      <header>
        <h2 className="text-4xl font-bold text-ink">Hola de nuevo</h2>
        <p className="text-xl text-ink-soft mt-2">Este es el resumen de la actividad del bar.</p>
      </header>

      <section className="grid grid-cols-4 gap-6">
        <StatCard label="Canjes este mes" value={stats.totalExchanges} icon={Gift} accent="amber" />
        <StatCard
          label="Canjes pendientes"
          value={stats.pendingExchanges}
          icon={Clock}
          accent={hasPending ? "rust" : "sage"}
          helperText={hasPending ? "Necesitan revisión" : undefined}
        />
        <StatCard label="Clientes activos" value={stats.totalCustomers} icon={Users} accent="sage" />
        <StatCard label="Puntos otorgados" value={stats.totalPointsAwarded.toLocaleString("es-AR")} icon={Sparkles} accent="amber" />
      </section>

      <section className={`grid gap-6 ${hasPending ? "grid-cols-2" : "grid-cols-1"}`}>
        {hasPending ? (
          <div className="rounded-2xl border border-ink/10 bg-cream-dark/30 p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <h3 className="text-2xl font-bold text-ink">Canjes pendientes a revisar</h3>
                <PingDot />
              </div>
              <a href="/verificar-canjes" className="flex items-center gap-1 text-lg text-amber-dark hover:underline">
                Ver todos <ArrowUpRight className="h-5 w-5" />
              </a>
            </div>
            <ul className="flex flex-col gap-3">
              {pendingExchanges.map((c) => (
                <li key={c.id} className="flex items-center justify-between rounded-xl bg-cream px-4 py-3">
                  <div>
                    <p className="text-xl text-ink font-medium">{c.customerName}</p>
                    <p className="text-lg text-ink-soft">{c.rewardTitle}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg text-rust-dark font-semibold">{c.points} pts</p>
                    <p className="text-base text-ink-soft">{c.createdAtFormatted}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        {topRewards.length > 0 ? (
          <div className="rounded-2xl border border-ink/10 bg-cream-dark/30 p-6">
            <h3 className="text-2xl font-bold text-ink mb-6">Recompensas más canjeadas</h3>
            <ul className="flex flex-col gap-3">
              {topRewards.map((r, i) => (
                <li key={r.id} className="flex items-center justify-between rounded-xl bg-cream px-4 py-3">
                  <div className="flex items-center gap-4">
                    <span className="text-xl font-bold text-amber-dark w-6">{i + 1}</span>
                    <div>
                      <p className="text-xl text-ink font-medium">{r.title}</p>
                      <p className="text-lg text-ink-soft">
                        {r.claimCount} {r.claimCount === 1 ? "canjeada" : "canjeadas"} este mes
                      </p>
                    </div>
                  </div>
                  <p className="text-lg text-sage-dark font-semibold">{r.points} pts</p>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </section>
    </div>
  );
}
