import { cn } from "@/lib/helpers/utils";

/** A labelled, non-interactive progress bar. Colors come from the caller so it fits any surface. */
export function ProgressBar({
  percent,
  label,
  valueText,
  trackClassName,
  fillClassName,
}: {
  percent: number;
  label: string;
  valueText: string;
  trackClassName?: string;
  fillClassName?: string;
}) {
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={percent}
      aria-valuetext={valueText}
      className={cn("h-2 w-full overflow-hidden rounded-full bg-border", trackClassName)}
    >
      <div className={cn("h-full rounded-full bg-brand", fillClassName)} style={{ width: `${percent}%` }} />
    </div>
  );
}
