"use client";

import { AlertTriangle, Clock3, Hourglass, Infinity as InfinityIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useCurrentTime } from "@/hooks/use-current-time";
import { pointExpirationStatus, type ExpirationSeverity, type PointExpirationData } from "@/lib/helpers/point-expiration";

const severityClasses: Record<ExpirationSeverity, string> = {
  none: "border-border bg-muted/20 text-foreground/80",
  normal: "border-border bg-background text-foreground/80",
  warning: "border-amber-500/40 bg-amber-500/15 text-amber-800 dark:text-amber-200",
  urgent: "border-orange-500/60 bg-orange-500/25 font-semibold text-orange-900 dark:text-orange-100",
  critical: "border-red-500/70 bg-red-500/25 font-bold text-red-900 ring-1 ring-red-500/30 dark:text-red-100",
  expired: "border-red-500/60 bg-red-500/20 font-semibold text-red-900 dark:text-red-100",
};

export function PointExpirationBadge(props: PointExpirationData) {
  const now = useCurrentTime();
  const status = pointExpirationStatus(props, now);
  if (!status) return null;

  const Icon = status.severity === "none" ? InfinityIcon
    : status.severity === "expired" || status.severity === "critical" ? AlertTriangle
    : status.severity === "urgent" ? Hourglass : Clock3;

  return (
    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px]">
      <Badge className={`border px-2.5 py-1 leading-4 ${severityClasses[status.severity]}`}>
        <Icon className="size-3.5 shrink-0" aria-hidden="true" />
        {status.label}
      </Badge>
      {status.deadline && (
        <time
          dateTime={status.deadline}
          title={`Vencimiento: ${status.formattedDeadline} (hora de Argentina)`}
          className="text-foreground/75"
        >
          {status.formattedDeadline} (hora de Argentina)
        </time>
      )}
    </div>
  );
}
