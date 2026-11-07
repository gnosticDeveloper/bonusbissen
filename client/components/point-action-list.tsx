"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PointExpirationBadge } from "@/components/point-expiration-badge";
import { ErrorState } from "@/components/error-state";
import { formatDateTime, formatNumber, pointActionLabel } from "@/lib/helpers/format";
import { Button } from "@/components/ui/button";
import { History, Pencil } from "lucide-react";
import { Customer } from "@/lib/types/customer";
import type { ActionResult } from "@/lib/api";
import type { PointAction } from "@/app/d/types";
import { getAllPointActions } from "@/app/d/[slug]/administrar-puntos/actions";
import dynamic from "next/dynamic";
import { ModalContentLoader } from "@/components/modals/action-status-modal";
import { useModal } from "@/components/modal";

const UpdateGrantModal = dynamic(() => import("./modals/grant/update-grant-modal").then((module) => module.UpdateGrantModal), {
  loading: () => <ModalContentLoader label="Cargando editor…" />,
});

/** A finished load, tagged with the request it answers. */
type LoadedHistory = { key: string; result: ActionResult<PointAction[]> };

export default function PointActionList({
  selected,
  refreshKey,
  onBalanceChanged,
}: {
  selected: Customer | null;
  refreshKey?: number;
  onBalanceChanged?: () => void;
}) {
  const { open } = useModal();
  const [historyRefresh, setHistoryRefresh] = useState(0);
  const [loaded, setLoaded] = useState<LoadedHistory | null>(null);

  // Changes whenever the history must be read again: another customer, a new
  // grant (refreshKey), a correction or a retry (historyRefresh).
  const requestKey = `${selected?.id ?? "all"}:${refreshKey ?? 0}:${historyRefresh}`;

  useEffect(() => {
    let cancelled = false;

    getAllPointActions(selected?.id)
      .then((result) => {
        if (!cancelled) setLoaded({ key: requestKey, result });
      })
      .catch(() => {
        if (!cancelled) setLoaded({ key: requestKey, result: { ok: false, error: "No pudimos conectarnos con el servidor." } });
      });

    return () => {
      cancelled = true;
    };
  }, [requestKey, selected?.id]);

  // A result for an older request doesn't count: we're still loading the current one.
  const result = loaded?.key === requestKey ? loaded.result : null;
  const status = !result ? "loading" : result.ok ? "ready" : "error";
  const actions = result?.ok ? result.data : [];
  const reload = () => setHistoryRefresh((key) => key + 1);

  return (
    <div className="min-h-0 lg:col-span-3">
      <Card className="flex max-h-[calc(100dvh-12rem)] min-h-0 flex-col overflow-hidden rounded-3xl border-border bg-card shadow-[0_14px_40px_rgba(25,24,23,0.06)] sm:max-h-[calc(100dvh-10rem)]">
        <CardHeader className="border-b border-border px-5 py-5 sm:px-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-foreground">Registro de actividad</p>
              <CardTitle className="text-base tracking-[-0.02em] text-foreground">Historial de movimientos</CardTitle>
              {selected ? (
                <p className="mt-1 text-xs text-foreground/80">
                  Movimientos de <span className="font-medium text-foreground">{selected.name}</span>
                </p>
              ) : (
                <p className="mt-1 text-xs text-foreground/80">Últimas operaciones de puntos del local.</p>
              )}
            </div>

            {status === "ready" ? (
              <Badge
                tone="neutral"
                className="rounded-full border border-border bg-background px-2.5 py-1 text-[11px] font-semibold text-foreground/80"
              >
                {actions.length}
              </Badge>
            ) : null}
          </div>
        </CardHeader>

        <CardContent className="flex min-h-0 flex-1 flex-col overflow-hidden px-4 py-4 sm:px-6">
          {status === "loading" ? (
            <div role="status" className="flex min-h-48 flex-col items-center justify-center gap-3 text-center">
              <span className="size-5 animate-spin rounded-full border-2 border-primary/25 border-t-primary" aria-hidden="true" />
              <p className="text-sm text-foreground/80">Cargando movimientos…</p>
            </div>
          ) : null}

          {result && !result.ok ? (
            <ErrorState
              icon={History}
              title="No pudimos cargar el historial"
              description={result.error}
              onRetry={reload}
            />
          ) : null}

          {status === "ready" && actions.length === 0 ? (
            <div className="flex min-h-48 items-center justify-center rounded-2xl border border-dashed border-border bg-background/50 px-5 text-center">
              <p className="max-w-xs text-sm leading-5 text-foreground/80">
                {selected ? "Este cliente todavía no tiene movimientos de puntos." : "Todavía no hay movimientos de puntos registrados."}
              </p>
            </div>
          ) : null}

          {status === "ready" && actions.length > 0 ? (
            <ul className="mt-4 min-h-0 flex-1 space-y-2.5 overflow-y-auto overscroll-contain pr-1 scrollbar-gutter-stable">
              {actions.map((a) => {
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
                          {formatNumber(a.amount)} pts
                        </Badge>
                        {a.correctedTransaction && <Badge tone="neutral">Corrección</Badge>}
                      </div>

                      <p className="mt-1 text-xs font-medium text-foreground">{pointActionLabel(a.type)}</p>
                      {a.expirationApplicable && (
                        <div className="mt-2">
                          <PointExpirationBadge expirationApplicable={a.expirationApplicable} expiresAt={a.expiresAt} />
                        </div>
                      )}

                      {a.note ? <p className="mt-2 line-clamp-2 text-xs leading-5 text-foreground/80">{a.note}</p> : null}
                      {a.correctedTransaction && (
                        <Button
                          type="button"
                          variant="outline"
                          className="mt-2"
                          onClick={() =>
                            open(
                              <div className="space-y-2 text-sm">
                                <p>Movimiento original: {formatNumber(a.correctedTransaction!.amount)} puntos</p>
                                <p>Fecha: {formatDateTime(a.correctedTransaction!.createdAt)}</p>
                                <p>Nota: {a.correctedTransaction!.note || "Sin nota"}</p>
                                <PointExpirationBadge
                                  expirationApplicable={a.correctedTransaction!.expirationApplicable}
                                  expiresAt={a.correctedTransaction!.expiresAt}
                                />
                                <p className="break-all text-xs">ID: {a.correctedTransaction!.id}</p>
                              </div>,
                              { title: "Movimiento original", description: "Información del movimiento que se corrigió." },
                            )
                          }
                        >
                          Ver movimiento original
                        </Button>
                      )}

                      <p className="mt-2 text-[11px] leading-4 text-foreground/80">
                        {formatDateTime(a.createdAt)}
                        <span className="mx-1">•</span>
                        por {a.byUserName}
                      </p>
                    </div>

                    {!a.correctedTransaction && (
                      <div className="flex shrink-0 gap-1 rounded-xl border border-border bg-card p-1 opacity-70 transition-opacity group-hover:opacity-100">
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          aria-label="Editar movimiento"
                          onClick={() =>
                            open(
                              <UpdateGrantModal
                                a={a}
                                onSucceed={() => {
                                  reload();
                                  onBalanceChanged?.();
                                }}
                              />,
                              {
                                title: "Corregir movimiento",
                                description: `Registrá una corrección para ${a.userName} sin modificar el movimiento original.`,
                              },
                            )
                          }
                          className="rounded-lg text-foreground/80 hover:bg-background hover:text-foreground"
                        >
                          <Pencil className="size-4" />
                        </Button>
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
