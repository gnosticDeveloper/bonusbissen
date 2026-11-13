"use client";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { redemptionStatusLabel } from "@/lib/helpers/format";
import { resolvedExchangesSync } from "@/lib/demo/actions";
import { useDemoState } from "@/lib/demo/store";
import { ExchangeState } from "@/lib/demo/types";

export default function ResolvedRedemptionsList() {
  const state = useDemoState();
  const resolved = state ? resolvedExchangesSync(state) : [];

  return (
    <Card
      className="flex min-h-0 max-h-[calc(100dvh-13rem)] flex-col overflow-hidden rounded-3xl border-border bg-card shadow-[0_14px_40px_rgba(25,24,23,0.06)] sm:max-h-[calc(100dvh-11rem)]"
      data-tour="resolved-list"
    >
      <CardHeader className="flex-row items-start justify-between gap-4 border-b border-border px-5 py-5 sm:px-6">
        <div>
          <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-foreground"> Historial </p>
          <CardTitle className="text-base tracking-[-0.02em]">Canjes resueltos</CardTitle>
          <p className="mt-1 text-xs text-foreground/80">Últimas recompensas entregadas o anuladas.</p>
        </div>
        <Badge tone="neutral" className="rounded-full border border-border bg-background px-2.5 py-1 text-[11px] font-semibold text-foreground/80">
          {resolved.length}
        </Badge>
      </CardHeader>
      <CardContent className="flex min-h-0 flex-1 flex-col overflow-hidden px-4 py-4 sm:px-6">
        {resolved.length === 0 ? (
          <div className="flex min-h-48 items-center justify-center rounded-2xl border border-dashed border-border bg-background/50 px-5 text-center">
            <p className="max-w-xs text-sm leading-5 text-foreground/80">Todavía no hay canjes resueltos.</p>
          </div>
        ) : (
          <ul className="mt-4 min-h-0 flex-1 space-y-2.5 overflow-y-auto overscroll-contain pr-1 scrollbar-gutter-stable">
            {resolved.map((r) => (
              <li key={r.id} className="grid gap-2 rounded-2xl border border-border bg-background/60 p-3.5 transition-colors hover:bg-background">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <span className="block truncate text-sm font-semibold text-foreground">{r.rewardTitle ?? "Recompensa"}</span>
                    <span className="mt-1 block truncate text-xs text-foreground/80">{r.userName ?? "Cliente"}</span>
                  </div>
                  <Badge tone={r.state === ExchangeState.COMPLETED ? "success" : "destructive"} className="shrink-0 rounded-full px-2.5 py-1 text-[10px] font-semibold">
                    {redemptionStatusLabel(r.state)}
                  </Badge>
                </div>
                <div className="grid gap-1 border-t border-border/70 pt-2 text-[11px] leading-4 text-foreground/80">
                  <span>Canjeado {r.formattedCreatedAt}</span> {r.employeeName ? <span>Resuelto por {r.employeeName}</span> : null}
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
