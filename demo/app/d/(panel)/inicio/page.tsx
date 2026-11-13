"use client";

import { Gift, Clock, Users, Sparkles, Trophy, Star } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { PageTour } from "@/components/page-tour";
import { getDashboardHome } from "@/lib/demo/actions";
import { useAsyncData, useStaffSession } from "@/lib/demo/hooks";
import { UserRole } from "@/lib/demo/types";
import { formatNumber } from "@/lib/helpers/format";

type Home = Extract<Awaited<ReturnType<typeof getDashboardHome>>, { ok: true }>["data"];

export default function HomePage() {
  const { state, staff } = useStaffSession();
  const storefrontId = staff?.storefrontId;
  const { result } = useAsyncData(() => getDashboardHome(), [storefrontId, state?.exchanges, state?.transactions]);
  const isAdmin = staff?.member.role === UserRole.ADMIN;
  const storefrontName = state?.storefronts.find((s) => s.id === storefrontId)?.name ?? "este local";

  return (
    <div className="flex flex-col gap-6">
      {result === null ? (
        <>
          <StatsGridSkeleton />
          <PendingExchangesSkeleton />
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <TopListSkeleton title="Top recompensas" />
            <TopListSkeleton title="Top clientes" />
          </div>
        </>
      ) : !result.ok ? (
        <SectionError message="No pudimos cargar las estadísticas." />
      ) : (
        <>
          <StatsGrid stats={result.data.stats} />
          {result.data.pending.length > 0 ? <PendingExchangesCard items={result.data.pending} /> : null}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <TopRewardsCard items={result.data.topRewards} />
            <TopClientsCard items={result.data.topClients} />
          </div>
        </>
      )}

      <PageTour
        id={isAdmin ? "panel-home-admin" : "panel-home-cashier"}
        ready={result !== null}
        steps={[
          {
            title: "Bienvenido al panel de tu negocio",
            body: (
              <>
                <p>Este es el panel que usan el dueño y el equipo. Todo lo que hagas acá se refleja en la app de los clientes.</p>
                <p>Cada página tiene una guía como esta la primera vez que entrás. Podés volver a verla desde el botón «Demo».</p>
              </>
            ),
          },
          {
            target: "storefront-switcher",
            title: "Trabajás sobre un local",
            body: isAdmin ? (
              <p>
                El panel muestra los datos del local elegido al entrar. Como administradora tenés dos: cambiá entre <strong>Centro</strong> y{" "}
                <strong>Palermo</strong> y vas a ver otros clientes, otras recompensas y otro programa de puntos.
              </p>
            ) : (
              <p>Como cajero operás solo en tu local: todo lo que ves y registrás corresponde a {storefrontName}.</p>
            ),
          },
          {
            target: "home-stats",
            title: `Un vistazo a ${storefrontName}`,
            body: <p>Canjes del mes, canjes que esperan entrega, clientes afiliados y puntos otorgados en este local.</p>,
          },
          {
            target: "home-pending",
            title: "Canjes por entregar",
            body: <p>Cuando un cliente reclama una recompensa, aparece acá hasta que alguien del equipo valida su código y confirma la entrega.</p>,
          },
          {
            target: "nav-points",
            title: "Lo de todos los días",
            body: <p>Sumá puntos por compra, validá canjes y consultá las recompensas desde la sección «Local».</p>,
          },
          {
            target: "nav-organization",
            title: "La configuración de tu negocio",
            body: <p>En «Organización» cargás tu logo y tu portada, creás sucursales y programas de puntos, sumás cajeros y revisás la auditoría.</p>,
          },
        ]}
      />
    </div>
  );
}

/* ---------- Estado de error compartido ---------- */

function SectionError({ message }: { message: string }) {
  return <section className="rounded-2xl border border-dashed border-border bg-card p-4 text-sm text-foreground/80 sm:p-6">{message}</section>;
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

function StatsGrid({ stats }: { stats: Home["stats"] }) {
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
    primary: "bg-primary/10 text-foreground",
    warning: "bg-amber-500/15 text-foreground",
    accent: "bg-violet-500/10 text-foreground",
    success: "bg-green-500/15 text-foreground",
  };

  return (
    <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4" data-tour="home-stats">
      {items.map((item) => {
        const Icon = item.icon;
        return (
          <div key={item.label} className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-4 sm:p-5">
            <div className="flex items-center justify-between">
              <span className="text-sm text-foreground/80">{item.label}</span>
              <div className={`flex size-8 shrink-0 items-center justify-center rounded-full ${toneClasses[item.tone]}`}>
                <Icon className="size-4" />
              </div>
            </div>
            <p className="font-serif text-2xl font-semibold text-foreground sm:text-3xl">{formatNumber(item.value)}</p>
          </div>
        );
      })}
    </div>
  );
}

function PendingExchangesCard({ items }: { items: Home["pending"] }) {
  return (
    <section className="rounded-2xl border border-border bg-card p-4 sm:p-6" data-tour="home-pending">
      <div className="mb-4 flex items-center gap-2">
        <Clock className="size-4 text-foreground" />
        <h2 className="font-serif text-lg font-semibold text-foreground">Canjes pendientes</h2>
        <span className="ml-auto flex size-6 items-center justify-center rounded-full bg-amber-500/15 text-xs font-medium text-foreground">{items.length}</span>
      </div>
      <div className="flex flex-col gap-3">
        {items.map((item) => (
          <div key={item.id} className="flex flex-col gap-2 rounded-xl border border-border p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <p className="font-medium text-foreground">{item.customerName}</p>
                <Badge tone="warning">Pendiente</Badge>
              </div>
              <p className="mt-0.5 text-sm text-foreground/80">{item.rewardTitle}</p>
              <p className="mt-1 text-xs text-foreground/80">{item.createdAtFormatted}</p>
            </div>
            <span className="shrink-0 text-sm font-semibold text-foreground">{formatNumber(Math.abs(item.points))} pts</span>
          </div>
        ))}
      </div>
    </section>
  );
}

function TopRewardsCard({ items }: { items: Home["topRewards"] }) {
  return (
    <section className="rounded-2xl border border-border bg-card p-4 sm:p-6">
      <div className="mb-4 flex items-center gap-2">
        <Trophy className="size-4 text-foreground" />
        <h2 className="font-serif text-lg font-semibold text-foreground">Top recompensas</h2>
      </div>
      {items.length === 0 ? (
        <p className="text-sm text-foreground/80">Todavía no hay canjes registrados.</p>
      ) : (
        <div className="flex flex-col gap-2">
          {items.map((item, index) => (
            <div key={item.id} className="flex items-center gap-3 rounded-xl px-3 py-2.5 hover:bg-muted/50">
              <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-foreground">{index + 1}</span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-foreground">{item.title}</p>
                <p className="text-xs text-foreground/80">
                  {item.claimCount} {item.claimCount === 1 ? "canje" : "canjes"} este mes
                </p>
              </div>
              <span className="shrink-0 text-sm font-semibold text-foreground">{formatNumber(item.points)} pts</span>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function TopClientsCard({ items }: { items: Home["topClients"] }) {
  return (
    <section className="rounded-2xl border border-border bg-card p-4 sm:p-6">
      <div className="mb-4 flex items-center gap-2">
        <Star className="size-4 text-foreground" />
        <h2 className="font-serif text-lg font-semibold text-foreground">Top clientes</h2>
      </div>
      {items.length === 0 ? (
        <p className="text-sm text-foreground/80">Todavía no hay clientes activos.</p>
      ) : (
        <div className="flex flex-col gap-2">
          {items.map((item, index) => (
            <div key={item.id} className="flex items-center gap-3 rounded-xl px-3 py-2.5 hover:bg-muted/50">
              <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-violet-500/10 text-xs font-semibold text-foreground">
                {index + 1}
              </span>
              <p className="min-w-0 flex-1 truncate text-sm font-medium text-foreground">{item.name}</p>
              <span className="shrink-0 text-sm font-semibold text-foreground">{formatNumber(item.totalPoints)} pts</span>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
