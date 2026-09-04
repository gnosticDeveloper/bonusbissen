import { getResolvedExchanges } from "@/app/[orgId]/(employee)/dashboard/redemptions/actions";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDateTime, redemptionStatusLabel, relativeTime } from "@/lib/helpers/format";

export function ResolvedRedemptionsSkeleton() {
  return <h1>Cargando...</h1>;
}

export default async function ResolvedRedemptionsList() {
  const resolved = await getResolvedExchanges();

  if (!resolved) return null;

  return (
    <Card className="flex flex-col">
      <CardHeader className="flex-row items-center justify-between">
        <CardTitle>Canjes resueltos</CardTitle>
        <Badge tone="neutral">{resolved.length}</Badge>
      </CardHeader>
      <CardContent className="flex-1">
        {resolved.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">Todavía no hay canjes resueltos.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {resolved.map((r) => {
              const rw = r.reward;
              const cu = r.customer;
              return (
                <li key={r.id} className="flex flex-col gap-1 rounded-lg border border-border bg-background/60 p-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-semibold">{rw?.title ?? "Recompensa"}</span>
                    <Badge tone={r.state === "delivered" ? "success" : "destructive"}>{redemptionStatusLabel(r.state)}</Badge>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {cu?.name ?? "Cliente"} · {cu?.phone ?? ""}
                  </span>
                  <div className="mt-1 grid gap-0.5 text-xs text-muted-foreground">
                    <span>Canjeado {relativeTime(r.redeemedAt)}</span>
                    {r.resolvedAt ? (
                      <span>
                        Resuelto el {formatDateTime(r.resolvedAt)}
                        {r.resolvedBy ? ` · por ${r.resolvedBy}` : ""}
                      </span>
                    ) : null}
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
