import { Suspense } from "react";
import { Gift, Clock, Users, Sparkles, Trophy, Star } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { getHomeStats, getPendingExchanges, getTopClients, getTopRewards } from "../../actions";
import { HomeStats, PendingExchangeReview, TopClient, TopReward } from "../../types";

export default function HomePage() {
  return (
    <div className="flex flex-col gap-6">
      <Suspense fallback={<StatsGridSkeleton />}>
        <StatsGridSection />
      </Suspense>

      <Suspense fallback={<PendingExchangesSkeleton />}>
        <PendingExchangesSection />
      </Suspense>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Suspense fallback={<TopListSkeleton title="Top recompensas" />}>
          <TopRewardsSection />
        </Suspense>
        <Suspense fallback={<TopListSkeleton title="Top clientes" />}>
          <TopClientsSection />
        </Suspense>
      </div>
    </div>
  );
}

/* ---------- Secciones (fetch + estado propio) ---------- */

async function StatsGridSection() {
  const stats = await getHomeStats();
  if (!stats.ok) return <SectionError message="No pudimos cargar las estadísticas." />;
  return <StatsGrid stats={stats.data} />;
}

async function PendingExchangesSection() {
  const pendingExchanges = await getPendingExchanges();
  if (!pendingExchanges.ok) return <SectionError message="No pudimos cargar los canjes pendientes." />;
  if (pendingExchanges.data.length === 0) return null;
  return <PendingExchangesCard items={pendingExchanges.data} />;
}

async function TopRewardsSection() {
  const topRewards = await getTopRewards();
  if (!topRewards.ok) return <SectionError message="No pudimos cargar el top de recompensas." />;
  return <TopRewardsCard items={topRewards.data} />;
}

async function TopClientsSection() {
  const topClients = await getTopClients();
  if (!topClients.ok) return <SectionError message="No pudimos cargar el top de clientes." />;
  return <TopClientsCard items={topClients.data} />;
}

/* ---------- Estado de error compartido ---------- */

function SectionError({ message }: { message: string }) {
  return <section className="rounded-2xl border border-dashed border-border bg-card p-4 text-sm text-muted-foreground sm:p-6">{message}</section>;
}

/* ---------- Skeletons ---------- */

function StatsGridSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-4 sm:p-5">
          <div className="flex items-center justify-between">
            <div className="h-4 w-20 animate-pulse rounded bg-muted motion-reduce:animate-none" />
            <div className="size-8 shrink-0 animate-pulse rounded-full bg-muted motion-reduce:animate-none" />
          </div>
          <div className="h-7 w-12 animate-pulse rounded bg-muted motion-reduce:animate-none" />
        </div>
      ))}
    </div>
  );
}

function PendingExchangesSkeleton() {
  return (
    <section className="rounded-2xl border border-border bg-card p-4 sm:p-6">
      <div className="mb-4 h-5 w-40 animate-pulse rounded bg-muted motion-reduce:animate-none" />
      <div className="flex flex-col gap-3">
        {Array.from({ length: 2 }).map((_, i) => (
          <div key={i} className="h-16 animate-pulse rounded-xl bg-muted motion-reduce:animate-none" />
        ))}
      </div>
    </section>
  );
}

function TopListSkeleton({ title }: { title: string }) {
  return (
    <section className="rounded-2xl border border-border bg-card p-4 sm:p-6">
      <h2 className="mb-4 font-serif text-lg font-semibold text-foreground">{title}</h2>
      <div className="flex flex-col gap-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-10 animate-pulse rounded-xl bg-muted motion-reduce:animate-none" />
        ))}
      </div>
    </section>
  );
}

/* ---------- Presentacionales ---------- */

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
    { label: "Clientes activos", value: stats.totalUsers, icon: Users, tone: "accent" },
    { label: "Puntos otorgados", value: stats.totalPointsAwarded, icon: Sparkles, tone: "success" },
  ];

  const toneClasses: Record<(typeof items)[number]["tone"], string> = {
    primary: "bg-primary/10 text-primary",
    warning: "bg-amber-500/15 text-amber-600 dark:text-amber-400",
    accent: "bg-violet-500/10 text-violet-600 dark:text-violet-400",
    success: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
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
        <Clock className="size-4 text-amber-600 dark:text-amber-400" />
        <h2 className="font-serif text-lg font-semibold text-foreground">Canjes pendientes</h2>
        <span className="ml-auto flex size-6 items-center justify-center rounded-full bg-amber-500/15 text-xs font-medium text-amber-600 dark:text-amber-400">
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
        <Star className="size-4 text-violet-600 dark:text-violet-400" />
        <h2 className="font-serif text-lg font-semibold text-foreground">Top clientes</h2>
      </div>
      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground">Todavía no hay clientes activos.</p>
      ) : (
        <div className="flex flex-col gap-2">
          {items.map((item, index) => (
            <div key={item.id} className="flex items-center gap-3 rounded-xl px-3 py-2.5 hover:bg-muted/50">
              <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-violet-500/10 text-xs font-semibold text-violet-600 dark:text-violet-400">
                {index + 1}
              </span>
              <p className="min-w-0 flex-1 truncate text-sm font-medium text-foreground">{item.name}</p>
              <span className="shrink-0 text-sm font-semibold text-emerald-600 dark:text-emerald-400">
                {item.totalPoints.toLocaleString("es-AR")} pts
              </span>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
