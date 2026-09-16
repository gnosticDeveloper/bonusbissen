import type { LucideIcon } from "lucide-react";
import { CheckCircle2, Clock3, XCircle } from "lucide-react";
import { ExchangeState } from "@/lib/types/exchange";

const STATE_CONFIG: Record<
  ExchangeState,
  {
    label: string;
    Icon: LucideIcon;
    className: string;
  }
> = {
  [ExchangeState.PENDING]: {
    label: "Pendiente",
    Icon: Clock3,
    className: "bg-primary/10 text-primary",
  },
  [ExchangeState.COMPLETED]: {
    label: "Entregado",
    Icon: CheckCircle2,
    className: "bg-foreground/10 text-foreground",
  },
  [ExchangeState.CANCELLED]: {
    label: "Anulado",
    Icon: XCircle,
    className: "bg-muted/20 text-muted-foreground",
  },
};

export function ExchangeStateBadge({
  state,
}: {
  state: ExchangeState;
}) {
  const { label, Icon, className } = STATE_CONFIG[state];

  return (
    <span
      className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-semibold ${className}`}
    >
      <Icon className="h-3 w-3" aria-hidden="true" />
      {label}
    </span>
  );
}
