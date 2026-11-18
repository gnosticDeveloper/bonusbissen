import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { formatNumber } from "@/lib/helpers/format";
import { rewardProgress } from "@/lib/helpers/reward-progress";
import type { Reward } from "@/lib/types/reward";
import { ProgressBar } from "./progress-bar";

/**
 * The balance on the brand color, plus progress toward the cheapest reward still out of reach.
 * Text color comes from `--brand-contrast`, picked for contrast against the brand color.
 */
export function PointsHeroCard({
  points,
  pointLabel,
  next,
  allRedeemable,
  historyHref,
}: {
  points: number | null;
  pointLabel: string;
  next: Reward | null;
  /** True when there are rewards and the balance covers every one. */
  allRedeemable: boolean;
  historyHref: string;
}) {
  const progress = points !== null && next ? rewardProgress(next.costPoints, points) : null;

  return (
    <section aria-labelledby="points-hero-title" className="relative overflow-hidden rounded-3xl bg-brand px-5.5 pt-5.5 pb-5 text-brand-contrast">
      <div aria-hidden="true" className="absolute -top-28 -right-22 size-65 rounded-full border-36 border-brand-contrast/7" />
      <div aria-hidden="true" className="absolute -top-10 -right-5 size-35 rounded-full border-18 border-brand-contrast/8" />

      <div className="relative flex items-start justify-between gap-3">
        <div className="flex min-w-0 flex-col gap-0.5">
          <h2 id="points-hero-title" className="text-[13px] font-semibold tracking-[0.04em] uppercase opacity-90">
            Tus {pointLabel}
          </h2>
          <p className="text-[56px] leading-none font-extrabold tracking-[-0.03em] tabular-nums">{points !== null ? formatNumber(points) : "—"}</p>
        </div>

        <Link
          href={historyHref}
          className="inline-flex h-9 shrink-0 items-center gap-1 rounded-full bg-brand-contrast/15 px-3 text-[13px] font-semibold transition-colors hover:bg-brand-contrast/25 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-contrast"
        >
          Movimientos
          <ChevronRight size={14} aria-hidden="true" />
        </Link>
      </div>

      {points === null && <p className="relative mt-4 text-sm opacity-90">No pudimos cargar tu saldo. Probá de nuevo en un rato.</p>}

      {next && progress && points !== null && (
        <div className="relative mt-4.5 flex flex-col gap-2 border-t border-brand-contrast/20 pt-4">
          <div className="flex justify-between gap-3 text-sm font-semibold">
            <span className="min-w-0">Próxima: {next.title}</span>
            <span className="shrink-0 tabular-nums">
              {formatNumber(points)} / {formatNumber(next.costPoints)}
            </span>
          </div>
          <ProgressBar
            percent={progress.percent}
            label={`Progreso hacia ${next.title}`}
            valueText={`${formatNumber(points)} de ${formatNumber(next.costPoints)} ${pointLabel}`}
            trackClassName="bg-brand-contrast/25"
            fillClassName="bg-brand-contrast"
          />
          <p className="text-[13px] opacity-90">
            Te faltan {formatNumber(progress.missing)} {pointLabel}
          </p>
        </div>
      )}

      {allRedeemable && points !== null && (
        <p className="relative mt-4.5 border-t border-brand-contrast/20 pt-4 text-sm font-semibold">Te alcanza para todas las recompensas.</p>
      )}
    </section>
  );
}
