import { Gift, Clock, Users, Sparkles, Trophy, Star } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { getHomeStats, getPendingExchanges, getTopClients, getTopRewards } from "../../actions";
import { HomeStats, PendingExchangeReview, TopClient, TopReward } from "../../types";

export default async function HomePage() {
  const [stats, pendingExchanges, topRewards, topClients] = await Promise.all([
    getHomeStats(),
    getPendingExchanges(),
    getTopRewards(),
    getTopClients(),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <StatsGrid stats={stats} />

      {pendingExchanges.length > 0 && <PendingExchangesCard items={pendingExchanges} />}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <TopRewardsCard items={topRewards} />
        <TopClientsCard items={topClients} />
      </div>
    </div>
  );
}

function StatsGrid({ stats }: { stats: HomeStats }) {
  const items: {
    label: string;
    value: number;
    icon: typeof Gift;
    tone: "primary" | "warning" | "accent" | "success";
  }[] = [
    { label: "Canjes este mes", value: stats.totalExchanges, icon: Gift, tone: "primary" },
    {
      label: "Canjes pendientes",
      value: stats.pendingExchanges,
      icon: Clock,
      tone: stats.pendingExchanges > 0 ? "warning" : "success",
    },
    { label: "Clientes activos", value: stats.totalCustomers, icon: Users, tone: "accent" },
    { label: "Puntos otorgados", value: stats.totalPointsAwarded, icon: Sparkles, tone: "success" },
  ];

  const toneClasses: Record<string, string> = {
    primary: "bg-primary/10 text-primary",
    warning: "bg-warning/20 text-warning-foreground",
    accent: "bg-accent/10 text-accent",
    success: "bg-success/10 text-success",
  };

  return (
    <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
      {items.map((item) => {
        const Icon = item.icon;
        return (
          <div key={item.label} className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-4 sm:p-5">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">{item.label}</span>
              <div className={`flex size-8 shrink-0 items-center justify-center rounded-full ${toneClasses[item.tone]}`}>
                <Icon className="size-4" />
              </div>
            </div>
            <p className="font-serif text-2xl font-semibold text-foreground sm:text-3xl">{item.value.toLocaleString("es-AR")}</p>
          </div>
        );
      })}
    </div>
  );
}

function PendingExchangesCard({ items }: { items: PendingExchangeReview[] }) {
  return (
    <section className="rounded-2xl border border-border bg-card p-4 sm:p-6">
      <div className="mb-4 flex items-center gap-2">
        <Clock className="size-4 text-warning" />
        <h2 className="font-serif text-lg font-semibold text-foreground">Canjes pendientes</h2>
        <span className="ml-auto flex size-6 items-center justify-center rounded-full bg-warning/10 text-xs font-medium text-warning">
          {items.length}
        </span>
      </div>

      <div className="flex flex-col gap-3">
        {items.map((item) => (
          <div key={item.id} className="flex flex-col gap-2 rounded-xl border border-border p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <p className="font-medium text-foreground">{item.customerName}</p>
                <Badge tone="warning">Pendiente</Badge>
              </div>
              <p className="mt-0.5 text-sm text-muted-foreground">{item.rewardTitle}</p>
              <p className="mt-1 text-xs text-muted-foreground">{item.createdAtFormatted}</p>
            </div>
            <span className="shrink-0 text-sm font-semibold text-primary">{item.points.toLocaleString("es-AR")} pts</span>
          </div>
        ))}
      </div>
    </section>
  );
}

function TopRewardsCard({ items }: { items: TopReward[] }) {
  return (
    <section className="rounded-2xl border border-border bg-card p-4 sm:p-6">
      <div className="mb-4 flex items-center gap-2">
        <Trophy className="size-4 text-primary" />
        <h2 className="font-serif text-lg font-semibold text-foreground">Top recompensas</h2>
      </div>

      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground">Todavía no hay canjes registrados.</p>
      ) : (
        <div className="flex flex-col gap-2">
          {items.map((item, index) => (
            <div key={item.id} className="flex items-center gap-3 rounded-xl px-3 py-2.5 hover:bg-muted/50">
              <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                {index + 1}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-foreground">{item.title}</p>
                <p className="text-xs text-muted-foreground">
                  {item.claimCount} {item.claimCount === 1 ? "canje" : "canjes"} este mes
                </p>
              </div>
              <span className="shrink-0 text-sm font-semibold text-foreground">{item.points.toLocaleString("es-AR")} pts</span>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function TopClientsCard({ items }: { items: TopClient[] }) {
  return (
    <section className="rounded-2xl border border-border bg-card p-4 sm:p-6">
      <div className="mb-4 flex items-center gap-2">
        <Star className="size-4 text-accent" />
        <h2 className="font-serif text-lg font-semibold text-foreground">Top clientes</h2>
      </div>

      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground">Todavía no hay clientes activos.</p>
      ) : (
        <div className="flex flex-col gap-2">
          {items.map((item, index) => (
            <div key={item.id} className="flex items-center gap-3 rounded-xl px-3 py-2.5 hover:bg-muted/50">
              <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-accent/10 text-xs font-semibold text-accent">
                {index + 1}
              </span>
              <p className="min-w-0 flex-1 truncate text-sm font-medium text-foreground">{item.name}</p>
              <span className="shrink-0 text-sm font-semibold text-success">{item.totalPoints.toLocaleString("es-AR")} pts</span>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
