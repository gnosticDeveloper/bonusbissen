"use client";

import { useEffect, useState, useTransition } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDateTime, formatPoints, pointActionLabel } from "@/lib/helpers/format";
import { Button } from "@/components/ui/button";
import { Pencil, Trash2, Wallet } from "lucide-react";
import { Customer } from "@/lib/types/customer";
import { getAllPointActions } from "@/app/d/[slug]/administrar-puntos/actions";
import { UpdateGrantModal } from "./modals/grant/update-grant-modal";
import { useModal } from "./modal";

type PointAction = Awaited<ReturnType<typeof getAllPointActions>>[number];

export default function PointActionList({ selected, refreshKey }: { selected: Customer | null; refreshKey?: number }) {
  const { open } = useModal();
  const [actions, setActions] = useState<PointAction[]>([]);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    let cancelled = false;

    startTransition(() => {
      getAllPointActions(selected?.id).then((data) => {
        if (!cancelled) setActions(data);
      });
    });

    return () => {
      cancelled = true;
    };
  }, [selected?.id, refreshKey]);

  const visibleActions = actions;

  if (visibleActions.length === 0 && !selected) {
    return (
      <section className="flex min-h-60 items-center justify-center rounded-3xl border border-dashed border-border bg-card/50 p-6 text-center lg:col-span-3">
        <div className="max-w-xs">
          <div className="mx-auto mb-4 grid size-12 place-items-center rounded-2xl bg-primary/10 text-primary">
            <Wallet className="size-5" aria-hidden="true" />
          </div>
          <p className="text-sm font-semibold text-foreground">Actividad de puntos</p>
          <p className="mt-1.5 text-xs leading-5 text-muted mix-blend-difference">Acá vas a poder consultar los últimos movimientos de puntos.</p>
        </div>
      </section>
    );
  }

  if (visibleActions.length === 0 && selected) {
    return (
      <section className="flex min-h-60 items-center justify-center rounded-3xl border border-dashed border-border bg-card/50 p-6 text-center lg:col-span-3">
        <div className="max-w-xs">
          <div className="mx-auto mb-4 grid size-12 place-items-center rounded-2xl bg-primary/10 text-primary">
            <Wallet className="size-5" aria-hidden="true" />
          </div>
          <p className="text-sm font-semibold text-foreground">Actividad de puntos</p>
          <p className="mt-1.5 text-xs leading-5 text-muted">
            Parece que <strong className="font-semibold text-foreground">{selected.name}</strong> todavía no tiene registros de puntos.
          </p>
        </div>
      </section>
    );
  }

  return (
    <div className="min-h-0 lg:col-span-3">
      <Card className="flex max-h-[calc(100dvh-12rem)] min-h-0 flex-col overflow-hidden rounded-3xl border-border bg-card shadow-[0_14px_40px_rgba(25,24,23,0.06)] sm:max-h-[calc(100dvh-10rem)]">
        <CardHeader className="border-b border-border px-5 py-5 sm:px-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-primary">Registro de actividad</p>
              <CardTitle className="text-base tracking-[-0.02em] text-foreground">Historial de movimientos</CardTitle>
              {selected ? (
                <p className="mt-1 text-xs text-muted">
                  Movimientos de <span className="font-medium text-foreground">{selected.name}</span>
                </p>
              ) : (
                <p className="mt-1 text-xs text-muted">Todas las operaciones de puntos del local.</p>
              )}
            </div>

            <Badge tone="neutral" className="rounded-full border border-border bg-background px-2.5 py-1 text-[11px] font-semibold text-muted">
              {visibleActions.length}
            </Badge>
          </div>
        </CardHeader>

        <CardContent className="flex min-h-0 flex-1 flex-col overflow-hidden px-4 py-4 sm:px-6">
          {isPending && visibleActions.length === 0 ? (
            <div className="flex min-h-48 flex-col items-center justify-center gap-3 text-center">
              <span className="size-5 animate-spin rounded-full border-2 border-primary/25 border-t-primary" />
              <p className="text-sm text-muted">Cargando movimientos…</p>
            </div>
          ) : visibleActions.length === 0 ? (
            <div className="flex min-h-48 items-center justify-center rounded-2xl border border-dashed border-border bg-background/50 px-5 text-center">
              <p className="max-w-xs text-sm leading-5 text-muted">
                {selected ? "Este cliente todavía no tiene movimientos de puntos." : "Todavía no hay movimientos de puntos registrados."}
              </p>
            </div>
          ) : (
            <ul className="mt-4 min-h-0 flex-1 space-y-2.5 overflow-y-auto overscroll-contain pr-1 scrollbar-gutter-stable">
              {visibleActions.map((a) => {
                const isPositive = a.amount >= 0;

                return (
                  <li
                    key={a.id}
                    className="group flex items-start justify-between gap-3 rounded-2xl border border-border bg-background/60 p-3.5 transition-colors hover:bg-background"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="truncate text-sm font-semibold text-foreground">{a.userName}</span>

                        <Badge tone={isPositive ? "success" : "destructive"} className="rounded-full px-2 py-0.5 text-[10px] font-semibold">
                          {isPositive ? "+" : ""}
                          {formatPoints(a.amount)} pts
                        </Badge>
                      </div>

                      <p className="mt-1 text-xs font-medium text-primary">{pointActionLabel(a.type)}</p>

                      {a.note ? <p className="mt-2 line-clamp-2 text-xs leading-5 text-muted">{a.note}</p> : null}

                      <p className="mt-2 text-[11px] leading-4 text-muted">
                        {formatDateTime(a.createdAt)}
                        <span className="mx-1 text-border">·</span>
                        por {a.byUserName}
                      </p>
                    </div>

                    <div className="flex shrink-0 gap-1 rounded-xl border border-border bg-card p-1 opacity-70 transition-opacity group-hover:opacity-100">
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        aria-label="Editar movimiento"
                        onClick={() =>
                          open(<UpdateGrantModal a={a} />, {
                            title: "Mofidicar puntos",
                            description: `Modifica los puntos que le entregaste a ${a.userName}`,
                          })
                        }
                        className="rounded-lg text-muted hover:bg-background hover:text-foreground"
                      >
                        <Pencil className="size-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        aria-label="Eliminar movimiento"
                        // onClick={() => open(<DeleteGrantModal pointA={a} />)}
                        className="rounded-lg text-muted hover:bg-primary/10 hover:text-primary"
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
