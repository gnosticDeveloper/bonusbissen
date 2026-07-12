import { Gift, Clock, Users, Sparkles, ArrowUpRight } from "lucide-react";
import StatCard from "@/components/stat-card";
import PingDot from "@/components/ping-dot";
import { getHomeStats, getPendingExchanges } from "../actions";
import { getTopRewards } from "../rewards.actions";
import { getTopCustomers } from "../customers.actions";

export default async function HomePage() {
  const [stats, topRewards, pendingExchanges, topCustomers] = await Promise.all([
    getHomeStats(),
    getTopRewards(),
    getPendingExchanges(),
    getTopCustomers(),
  ]);

  return (
    <div className="flex flex-col gap-10">
      <header>
        <h2 className="text-4xl font-bold text-ink">Hola de nuevo</h2>
        <p className="text-xl text-ink-soft mt-2">Este es el resumen de la actividad del bar.</p>
      </header>

      <section className="grid grid-cols-4 gap-6">
        <StatCard label="Canjes este mes" value={stats.totalExchanges} icon={Gift} accent="amber" />
        <StatCard label="Canjes pendientes" value={stats.pendingExchanges} icon={Clock} accent="rust" helperText="Necesitan revisión" />
        <StatCard label="Clientes activos" value={stats.totalCustomers} icon={Users} accent="sage" />
        <StatCard label="Puntos otorgados" value={stats.totalPointsAwarded.toLocaleString("es-AR")} icon={Sparkles} accent="amber" />
      </section>

      <section className="grid grid-cols-2 gap-6">
        <div className="rounded-2xl border border-ink/10 bg-cream-dark/30 p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <h3 className="text-2xl font-bold text-ink">Canjes pendientes a revisar</h3>
              <PingDot />
            </div>
            <a href="/canjes" className="flex items-center gap-1 text-lg text-amber-dark hover:underline">
              Ver todos <ArrowUpRight className="h-5 w-5" />
            </a>
          </div>
          <ul className="flex flex-col gap-3">
            {pendingExchanges.map((c) => (
              <li key={c.id} className="flex items-center justify-between rounded-xl bg-cream px-4 py-3">
                <div>
                  <p className="text-xl text-ink font-medium">{c.customerId}</p>
                  <p className="text-lg text-ink-soft">{c.rewardId}</p>
                </div>
                <div className="text-right">
                  <p className="text-lg text-rust-dark font-semibold">{c.points} pts</p>
                  <p className="text-base text-ink-soft">{c.createdAt}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded-2xl border border-ink/10 bg-cream-dark/30 p-6">
          <h3 className="text-2xl font-bold text-ink mb-6">Top clientes del mes</h3>
          <ul className="flex flex-col gap-3">
            {topCustomers.map((c, i) => (
              <li key={c.id} className="flex items-center justify-between rounded-xl bg-cream px-4 py-3">
                <div className="flex items-center gap-4">
                  <span className="text-xl font-bold text-amber-dark w-6">{i + 1}</span>
                  <div>
                    <p className="text-xl text-ink font-medium">{c.name}</p>
                    <p className="text-lg text-ink-soft">{c.totalVisits} visitas este mes</p>
                  </div>
                </div>
                <p className="text-lg text-sage-dark font-semibold">{c.points} pts</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="rounded-2xl border border-ink/10 bg-cream-dark/30 p-6">
        <h3 className="text-2xl font-bold text-ink mb-6">Recompensas más canjeadas</h3>
        <div className="grid grid-cols-4 gap-4">
          {topRewards.map((r) => (
            <div key={r.id} className="rounded-xl bg-cream px-5 py-4 flex flex-col gap-2">
              <p className="text-xl text-ink font-semibold">{r.name}</p>
              <p className="text-lg text-ink-soft">{r.points} pts</p>
              <p className="text-lg text-amber-dark font-medium">{r.exchangeCount} canjes</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
