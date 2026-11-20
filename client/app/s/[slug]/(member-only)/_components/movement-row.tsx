import { Gift, Hourglass, Plus, SlidersHorizontal, type LucideIcon } from "lucide-react";
import { PointExpirationBadge } from "@/components/point-expiration-badge";
import { formatNumber } from "@/lib/helpers/format";
import type { MovementResponse } from "@/lib/types/movement";

const KINDS: Record<MovementResponse["type"], { Icon: LucideIcon; tile: string; amount: string }> = {
  earn: { Icon: Plus, tile: "bg-brand/20 text-brand-ink", amount: "text-brand-ink" },
  redeem: { Icon: Gift, tile: "bg-amber-500/15 text-amber-800 dark:text-amber-300", amount: "text-amber-800 dark:text-amber-300" },
  adjust: { Icon: SlidersHorizontal, tile: "bg-foreground/10 text-foreground/80", amount: "text-foreground/85" },
  expire: { Icon: Hourglass, tile: "bg-foreground/10 text-foreground/80", amount: "text-foreground/85" },
};

/** One history row. `currentStorefrontName` hides the storefront name unless the movement happened elsewhere in the program. */
export function MovementRow({ movement, currentStorefrontName }: { movement: MovementResponse; currentStorefrontName: string }) {
  const { Icon, tile, amount } = KINDS[movement.type];
  const label = movement.pointsLabel || "puntos";
  const points = formatNumber(Math.abs(movement.points));
  const title = movement.type === "redeem" ? `Canje: ${movement.title}` : movement.title;
  const elsewhere = movement.storefrontName && movement.storefrontName !== currentStorefrontName ? movement.storefrontName : null;

  return (
    <li className="flex items-center gap-3.5 border-b border-border/70 py-3.5">
      <span aria-hidden="true" className={`grid size-10.5 shrink-0 place-items-center self-start rounded-[13px] ${tile}`}>
        <Icon size={20} />
      </span>

      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <p className="text-[15px] leading-[1.3] font-bold wrap-break-word text-foreground">{title}</p>
        <p className="text-[13px] text-foreground/75">
          {movement.formattedCreatedAt}
          {elsewhere && ` · ${elsewhere}`}
        </p>
        {movement.correction && (
          <p className="text-xs text-foreground/75">
            Corrección del movimiento original de{" "}
            {movement.correctedTransactionAmount ? `${formatNumber(movement.correctedTransactionAmount)} ${label}` : label}
          </p>
        )}
        {movement.expirationApplicable && (
          <div className="mt-1.5">
            <PointExpirationBadge expirationApplicable={movement.expirationApplicable} expiresAt={movement.expiresAt} expired={movement.type === "expire"} />
          </div>
        )}
      </div>

      <p className={`shrink-0 self-start text-[17px] font-bold tabular-nums ${amount}`}>
        <span aria-hidden="true">
          {movement.points > 0 ? "+" : "−"}
          {points}
        </span>
        <span className="sr-only">
          {movement.points > 0 ? "Sumaste" : "Restaste"} {points} {label}
        </span>
      </p>
    </li>
  );
}
