import { getResolvedExchanges } from "@/app/d/[slug]/verificacion-canjes/actions";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { redemptionStatusLabel } from "@/lib/helpers/format";
import { Skeleton } from "./ui/skeleton";

export function ResolvedRedemptionsSkeleton() {
  return (
    <Card className="overflow-hidden rounded-3xl border-border bg-card shadow-[0_14px_40px_rgba(25,24,23,0.06)]">
      <CardHeader className="flex-row items-center justify-between border-b border-border px-5 py-5 sm:px-6">
        <div className="grid gap-2">
          <Skeleton className="h-4 w-36" /> <Skeleton className="h-3 w-48" />
        </div>
        <Skeleton className="h-7 w-8 rounded-full" />
      </CardHeader>
      <CardContent className="grid gap-2.5 px-4 py-4 sm:px-6">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="grid gap-2 rounded-2xl border border-border bg-background/60 p-3.5">
            <div className="flex items-center justify-between gap-3">
              <Skeleton className="h-4 w-40" /> <Skeleton className="h-6 w-20 rounded-full" />
            </div>
            <Skeleton className="h-3 w-52" /> <Skeleton className="h-3 w-44" /> <Skeleton className="h-3 w-56" />
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

export default async function ResolvedRedemptionsList() {
  const resolved = await getResolvedExchanges();

  if (!resolved) return null;

  return (
    <Card className="overflow-hidden rounded-3xl border-border bg-card shadow-[0_14px_40px_rgba(25,24,23,0.06)]">
      <CardHeader className="flex-row items-start justify-between gap-4 border-b border-border px-5 py-5 sm:px-6">
        <div>
          <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-primary"> Historial </p>
          <CardTitle className="text-base tracking-[-0.02em]">Canjes resueltos</CardTitle>
          <p className="mt-1 text-xs text-muted">Últimas recompensas entregadas o anuladas.</p>
        </div>
        <Badge tone="neutral" className="rounded-full border border-border bg-background px-2.5 py-1 text-[11px] font-semibold text-muted">
          {resolved.length}
        </Badge>
      </CardHeader>
      <CardContent className="px-4 py-4 sm:px-6">
        {resolved.length === 0 ? (
          <div className="flex min-h-48 items-center justify-center rounded-2xl border border-dashed border-border bg-background/50 px-5 text-center">
            <p className="max-w-xs text-sm leading-5 text-muted">Todavía no hay canjes resueltos.</p>
          </div>
        ) : (
          <ul className="flex flex-col gap-2.5">
            {resolved.map((r) => {
              return (
                <li key={r.id} className="grid gap-2 rounded-2xl border border-border bg-background/60 p-3.5 transition-colors hover:bg-background">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <span className="block truncate text-sm font-semibold text-foreground">{r.rewardTitle ?? "Recompensa"}</span>
                      <span className="mt-1 block truncate text-xs text-muted">{r.userName ?? "Cliente"}</span>
                    </div>
                    <Badge
                      tone={r.state === "delivered" ? "success" : "destructive"}
                      className="shrink-0 rounded-full px-2.5 py-1 text-[10px] font-semibold"
                    >
                      {redemptionStatusLabel(r.state)}
                    </Badge>
                  </div>
                  <div className="grid gap-1 border-t border-border/70 pt-2 text-[11px] leading-4 text-muted">
                    <span>Canjeado {r.formattedCreatedAt}</span> {r.employeeName ? <span>Resuelto por {r.employeeName}</span> : null}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
