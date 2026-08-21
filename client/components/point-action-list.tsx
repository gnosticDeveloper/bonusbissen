import { getAllPointActions } from "@/app/dashboard/actions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDateTime, formatPoints, pointActionLabel } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Pencil, Trash2 } from "lucide-react";
import { Customer } from "@/lib/definitions";

export default async function PointActionList({ selected }: { selected?: Customer }) {
  const visibleActions = await getAllPointActions(selected?.id);

  return (
    <div className="lg:col-span-3">
      <Card className="flex h-full flex-col">
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle>
            Historial de movimientos
            {selected ? <span className="ml-1 font-normal text-muted-foreground">· {selected.name}</span> : null}
          </CardTitle>
          <Badge tone="neutral">{visibleActions.length}</Badge>
        </CardHeader>
        <CardContent className="flex-1">
          {visibleActions.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              {selected ? "Este cliente todavía no tiene movimientos de puntos." : "Todavía no hay movimientos de puntos registrados."}
            </p>
          ) : (
            <ul className="flex flex-col gap-2">
              {visibleActions.map((a) => (
                <li key={a.id} className="flex items-start justify-between gap-3 rounded-lg border border-border bg-background/60 p-3">
                  <div className="flex flex-col gap-0.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-semibold">{a.customerName}</span>
                      <Badge tone={a.amount >= 0 ? "success" : "destructive"}>
                        {a.amount >= 0 ? "+" : ""}
                        {formatPoints(a.amount)} pts
                      </Badge>
                      <span className="text-xs text-muted-foreground">{pointActionLabel(a.type)}</span>
                    </div>
                    {a.note ? <span className="text-xs text-muted-foreground">{a.note}</span> : null}
                    <span className="text-xs text-muted-foreground">
                      {formatDateTime(a.createdAt)} · por {a.byUserName}
                    </span>
                  </div>
                  <div className="flex shrink-0 gap-1">
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      aria-label="Editar movimiento"
                      onClick={() => {
                        // setEditing(a)
                      }}
                    >
                      <Pencil />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      aria-label="Eliminar movimiento"
                      onClick={() => {
                        // setRemoving(a);
                      }}
                    >
                      <Trash2 className="text-destructive" />
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
