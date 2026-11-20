import { Suspense } from "react";
import Link from "next/link";
import { CalendarDays, Clock, Gift, PackageX, Sparkles, Star, Trophy, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { getHomeStats, getPendingQueue, getTopClients, getTopRewards, getUnclaimedRewards } from "../../actions";
import { HomeStats, PendingExchangeQueue, TopClient, TopReward, UnclaimedReward } from "@/lib/types/dashboard";
import { formatDate, formatNumber } from "@/lib/helpers/format";
import { isOverdue, OVERDUE_AFTER_DAYS, percentChange, timeAgo } from "@/lib/helpers/dashboard";
import { cn } from "@/lib/helpers/utils";
import { ValidateExchangeButton } from "./_components/validate-exchange-button";

/** The backend's fixed dashboard window (`DashboardWindow`); there's no period selector yet. */
const PERIOD_DAYS = 30;
const PERIOD_LABEL = `Últimos ${PERIOD_DAYS} días`;
const PENDING_PREVIEW_ROWS = 6;
/** The backend's cap for one queue request; "Ver todos" asks for this many. */
const PENDING_ALL_ROWS = 100;
const UNCLAIMED_PREVIEW_ROWS = 6;
/** `?pendientes=todos` expands the pending table in place. */
const SHOW_ALL_PENDING = "todos";

type HomePageProps = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};

export default async function HomePage({ params, searchParams }: HomePageProps) {
  const [{ slug }, query] = await Promise.all([params, searchParams]);
  const showAllPending = query.pendientes === SHOW_ALL_PENDING;
  const basePath = `/d/${slug}/inicio`;

  return (
    <div className="flex flex-col gap-6">
      <Suspense fallback={<StatsGridSkeleton />}>
        <StatsGridSection />
      </Suspense>

      <Suspense key={String(showAllPending)} fallback={<PendingExchangesSkeleton />}>
        <PendingExchangesSection showAll={showAllPending} basePath={basePath} />
      </Suspense>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Suspense fallback={<TopListSkeleton title="Top recompensas" />}>
          <TopRewardsSection />
        </Suspense>
        <Suspense fallback={<TopListSkeleton title="Top clientes" />}>
          <TopClientsSection />
        </Suspense>
      </div>

      <Suspense fallback={<TopListSkeleton title="Recompensas sin canjes" />}>
        <UnclaimedRewardsSection />
      </Suspense>
    </div>
  );
}

/* ---------- Secciones (fetch + estado propio) ---------- */

async function StatsGridSection() {
  const stats = await getHomeStats();
  if (!stats.ok) return <SectionError message="No pudimos cargar las estadísticas." />;
  // Every figure on this page belongs to the selected storefront's program; without one there's nothing to show.
  if (stats.data.programName === null) {
    return (
      <section className="rounded-2xl border border-dashed border-border bg-card p-4 text-sm text-foreground/80 sm:p-6">
        <p className="font-medium text-foreground">Este local no tiene un programa de puntos asignado.</p>
        <p className="mt-1">Un administrador puede asignarle uno desde «Mi negocio»; después vas a ver acá sus canjes, clientes y puntos.</p>
      </section>
    );
  }
  return (
    <div className="flex flex-col gap-3">
      <p className="flex items-start gap-2 text-sm text-foreground/80">
        <CalendarDays className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
        <span>
          Programa <strong className="font-semibold text-foreground">{stats.data.programName}</strong> · últimos {PERIOD_DAYS} días,
          comparados con los {PERIOD_DAYS} días anteriores. Los locales que comparten este programa ven los mismos datos.
        </span>
      </p>
      <StatsGrid stats={stats.data} />
    </div>
  );
}

/** Reads the queue and the time it was read: waiting times are shown as of that moment. */
async function loadPendingQueue(limit: number) {
  const queue = await getPendingQueue(limit);
  return { queue, readAt: Date.now() };
}

async function PendingExchangesSection({ showAll, basePath }: { showAll: boolean; basePath: string }) {
  const { queue, readAt } = await loadPendingQueue(showAll ? PENDING_ALL_ROWS : PENDING_PREVIEW_ROWS);
  if (!queue.ok) return <SectionError message="No pudimos cargar los canjes pendientes." />;
  if (queue.data.total === 0) return null;
  return <PendingExchangesCard queue={queue.data} showAll={showAll} basePath={basePath} now={readAt} />;
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

async function UnclaimedRewardsSection() {
  const unclaimed = await getUnclaimedRewards();
  if (!unclaimed.ok) return <SectionError message="No pudimos cargar las recompensas sin canjes." />;
  return <UnclaimedRewardsCard items={unclaimed.data} />;
}

/* ---------- Estado de error compartido ---------- */

function SectionError({ message }: { message: string }) {
  return <section className="rounded-2xl border border-dashed border-border bg-card p-4 text-sm text-foreground/80 sm:p-6">{message}</section>;
}

/* ---------- Skeletons ---------- */

function StatsGridSkeleton() {
  return (
    <div className="flex flex-col gap-3">
      <div className="h-5 w-72 max-w-full animate-pulse rounded bg-muted motion-reduce:animate-none" />
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-4 sm:p-5">
            <div className="flex items-center justify-between">
              <div className="h-4 w-20 animate-pulse rounded bg-muted motion-reduce:animate-none" />
              <div className="size-8 shrink-0 animate-pulse rounded-full bg-muted motion-reduce:animate-none" />
            </div>
            <div className="h-7 w-12 animate-pulse rounded bg-muted motion-reduce:animate-none" />
            <div className="h-3 w-24 animate-pulse rounded bg-muted motion-reduce:animate-none" />
          </div>
        ))}
      </div>
    </div>
  );
}

function PendingExchangesSkeleton() {
  return (
    <section className="rounded-2xl border border-border bg-card p-4 sm:p-6">
      <div className="mb-4 h-5 w-40 animate-pulse rounded bg-muted motion-reduce:animate-none" />
      <div className="flex flex-col gap-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-12 animate-pulse rounded-xl bg-muted motion-reduce:animate-none" />
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

function CardHeading({ icon: Icon, title, subtitle, children }: { icon: typeof Gift; title: string; subtitle?: string; children?: React.ReactNode }) {
  return (
    <div className="mb-4 flex flex-wrap items-center gap-x-2 gap-y-1">
      <Icon className="size-4 shrink-0 text-foreground" aria-hidden="true" />
      <h2 className="font-serif text-lg font-semibold text-foreground">{title}</h2>
      {subtitle && <span className="text-xs text-foreground/80">· {subtitle}</span>}
      {children}
    </div>
  );
}

/** "+12% vs. los 30 días anteriores", or a plain note when there's no earlier figure to compare with. */
function Comparison({ current, previous }: { current: number; previous: number }) {
  const change = percentChange(current, previous);
  const text =
    change === null
      ? `Sin datos de los ${PERIOD_DAYS} días anteriores`
      : change === 0
        ? `Igual que los ${PERIOD_DAYS} días anteriores`
        : `${change > 0 ? "+" : "−"}${formatNumber(Math.abs(change))}% vs. los ${PERIOD_DAYS} días anteriores`;
  return <p className="text-xs text-foreground/80">{text}</p>;
}

function StatsGrid({ stats }: { stats: HomeStats }) {
  const items: {
    label: string;
    value: number;
    /** Same figure for the previous window, or `null` for a snapshot with nothing to compare. */
    previous: number | null;
    note?: string;
    icon: typeof Gift;
    tone: "primary" | "warning" | "accent" | "success";
  }[] = [
    { label: "Canjes", value: stats.exchanges, previous: stats.previousExchanges, icon: Gift, tone: "primary" },
    {
      label: "Canjes pendientes (total)",
      value: stats.pendingExchanges,
      previous: null,
      note: "Esperando ahora",
      icon: Clock,
      tone: stats.pendingExchanges > 0 ? "warning" : "success",
    },
    { label: "Clientes activos", value: stats.activeCustomers, previous: stats.previousActiveCustomers, icon: Users, tone: "accent" },
    { label: "Puntos otorgados", value: stats.pointsGranted, previous: stats.previousPointsGranted, icon: Sparkles, tone: "success" },
  ];

  const toneClasses: Record<(typeof items)[number]["tone"], string> = {
    primary: "bg-primary/10 text-foreground",
    warning: "bg-amber-500/15 text-foreground",
    accent: "bg-violet-500/10 text-foreground",
    success: "bg-green-500/15 text-foreground",
  };

  return (
    <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4" data-guide="home-stats">
      {items.map((item) => {
        const Icon = item.icon;
        return (
          <div key={item.label} className="flex flex-col gap-2 rounded-2xl border border-border bg-card p-4 sm:p-5">
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm text-foreground/80">{item.label}</span>
              <div className={`flex size-8 shrink-0 items-center justify-center rounded-full ${toneClasses[item.tone]}`}>
                <Icon className="size-4" aria-hidden="true" />
              </div>
            </div>
            <p className="font-serif text-2xl font-semibold text-foreground sm:text-3xl">{formatNumber(item.value)}</p>
            {item.previous === null ? (
              <p className="text-xs text-foreground/80">{item.note}</p>
            ) : (
              <Comparison current={item.value} previous={item.previous} />
            )}
          </div>
        );
      })}
    </div>
  );
}

function PendingExchangesCard({ queue, showAll, basePath, now }: { queue: PendingExchangeQueue; showAll: boolean; basePath: string; now: number }) {
  const { total, items } = queue;
  const hidden = total - items.length;

  return (
    <section aria-labelledby="pending-exchanges-heading" data-guide="home-pending" className="rounded-2xl border border-border bg-card p-4 sm:p-6">
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Clock className="size-4 text-foreground" aria-hidden="true" />
        <h2 id="pending-exchanges-heading" className="font-serif text-lg font-semibold text-foreground">
          Canjes pendientes
        </h2>
        <span className="flex h-6 min-w-6 items-center justify-center rounded-full bg-amber-500/15 px-1.5 text-xs font-medium text-foreground">
          <span className="sr-only">Total: </span>
          {formatNumber(total)}
        </span>
        {showAll ? (
          <Link href={basePath} scroll={false} className="ml-auto text-sm font-medium text-foreground underline-offset-4 hover:underline">
            Ver menos
          </Link>
        ) : (
          hidden > 0 && (
            <Link
              href={`${basePath}?pendientes=${SHOW_ALL_PENDING}`}
              scroll={false}
              className="ml-auto text-sm font-medium text-foreground underline-offset-4 hover:underline"
            >
              Ver todos ({formatNumber(total)})
            </Link>
          )
        )}
      </div>

      <table className="w-full table-fixed border-separate border-spacing-y-1 text-sm">
        <caption className="sr-only">
          Canjes pendientes, del más antiguo al más reciente. Los que esperan más de {OVERDUE_AFTER_DAYS} días están resaltados.
        </caption>
        <thead>
          <tr className="text-left text-xs font-medium text-foreground/80">
            <th scope="col" className="px-3 pb-1 font-medium">Cliente</th>
            <th scope="col" className="hidden px-3 pb-1 font-medium sm:table-cell">Recompensa</th>
            <th scope="col" className="hidden w-24 px-3 pb-1 text-right font-medium sm:table-cell">Puntos</th>
            <th scope="col" className="w-32 px-3 pb-1 font-medium sm:w-40">Esperando</th>
            <th scope="col" className="w-20 px-3 pb-1 sm:w-24">
              <span className="sr-only">Acciones</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {items.map((item, index) => {
            const overdue = isOverdue(item.createdAt, now);
            const cell = cn("px-3 py-2.5 align-middle", overdue ? "bg-amber-500/10" : "bg-background/60");
            return (
              <tr key={item.id}>
                <td className={cn(cell, "rounded-l-xl")}>
                  <p className="truncate font-medium text-foreground">{item.userName}</p>
                  <p className="truncate text-xs text-foreground/80 sm:hidden">
                    {item.rewardTitle} · {formatNumber(Math.abs(item.points))} pts
                  </p>
                </td>
                <td className={cn(cell, "hidden truncate text-foreground sm:table-cell")}>{item.rewardTitle}</td>
                <td className={cn(cell, "hidden text-right font-semibold text-foreground sm:table-cell")}>
                  {formatNumber(Math.abs(item.points))} pts
                </td>
                <td className={cell}>
                  <time dateTime={item.createdAt} title={formatDate(item.createdAt)} className="block text-foreground">
                    {timeAgo(item.createdAt, now) ?? "Fecha no disponible"}
                  </time>
                  {overdue && (
                    <Badge tone="warning" className="mt-0.5 text-[10px]">
                      Más de {OVERDUE_AFTER_DAYS} días
                    </Badge>
                  )}
                </td>
                <td className={cn(cell, "rounded-r-xl text-right")} data-guide={index === 0 ? "home-validate" : undefined}>
                  <ValidateExchangeButton exchange={item} />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {showAll && hidden > 0 && (
        <p className="mt-3 text-xs text-foreground/80">
          Se muestran los {formatNumber(items.length)} más antiguos de {formatNumber(total)}.
        </p>
      )}
    </section>
  );
}

function TopRewardsCard({ items }: { items: TopReward[] }) {
  return (
    <section className="rounded-2xl border border-border bg-card p-4 sm:p-6">
      <CardHeading icon={Trophy} title="Top recompensas" subtitle={PERIOD_LABEL} />
      {items.length === 0 ? (
        <p className="text-sm text-foreground/80">No hubo canjes en los últimos {PERIOD_DAYS} días.</p>
      ) : (
        <div className="flex flex-col gap-2">
          {items.map((item, index) => (
            <div key={item.id} className="flex items-center gap-3 rounded-xl px-3 py-2.5 hover:bg-muted/50">
              <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-foreground">
                {index + 1}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-foreground">{item.title}</p>
                <p className="text-xs text-foreground/80">
                  {item.claimCount} {item.claimCount === 1 ? "canje" : "canjes"}
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

function TopClientsCard({ items }: { items: TopClient[] }) {
  return (
    <section className="rounded-2xl border border-border bg-card p-4 sm:p-6">
      <CardHeading icon={Star} title="Top clientes" subtitle={PERIOD_LABEL} />
      {items.length === 0 ? (
        <p className="text-sm text-foreground/80">No se otorgaron puntos en los últimos {PERIOD_DAYS} días.</p>
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

function UnclaimedRewardsCard({ items }: { items: UnclaimedReward[] }) {
  const shown = items.slice(0, UNCLAIMED_PREVIEW_ROWS);
  const more = items.length - shown.length;

  return (
    <section className="rounded-2xl border border-border bg-card p-4 sm:p-6">
      <CardHeading icon={PackageX} title="Recompensas sin canjes" subtitle={PERIOD_LABEL} />
      {items.length === 0 ? (
        <p className="text-sm text-foreground/80">No hay recompensas sin canjes en los últimos {PERIOD_DAYS} días.</p>
      ) : (
        <>
          <p className="mb-3 text-xs text-foreground/80">
            Nadie las canjeó en los últimos {PERIOD_DAYS} días. No se incluyen las agregadas hace menos de {PERIOD_DAYS} días.
          </p>
          <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {shown.map((item) => (
              <li key={item.id} className="flex items-center gap-3 rounded-xl border border-border px-3 py-2.5">
                <p className="min-w-0 flex-1 truncate text-sm font-medium text-foreground">{item.title}</p>
                <span className="shrink-0 text-sm text-foreground/80">{formatNumber(item.points)} pts</span>
              </li>
            ))}
          </ul>
          {more > 0 && <p className="mt-3 text-xs text-foreground/80">y {formatNumber(more)} más.</p>}
        </>
      )}
    </section>
  );
}
