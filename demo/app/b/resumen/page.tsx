"use client";

import { Gift } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { ErrorState } from "@/components/error-state";
import { ExchangeCard } from "@/components/exchange-card";
import { PageTour } from "@/components/page-tour";
import { getExchangeHistory } from "@/lib/demo/actions";
import { useAsyncData } from "@/lib/demo/hooks";
import { ExchangeState } from "@/lib/demo/types";

function Loading() {
  return (
    <div className="flex flex-col gap-4 px-4 pb-24 pt-6">
      <div className="h-6 w-32 motion-safe:animate-pulse rounded-md bg-muted/20" />
      <ul className="flex flex-col gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <li key={i} className="flex gap-3 rounded-2xl border border-border bg-card p-3">
            <div className="h-16 w-16 shrink-0 motion-safe:animate-pulse rounded-xl bg-muted/20" />
            <div className="flex flex-1 flex-col gap-2 py-1">
              <div className="h-3.5 w-3/4 motion-safe:animate-pulse rounded bg-muted/20" />
              <div className="h-3 w-1/2 motion-safe:animate-pulse rounded bg-muted/20" />
              <div className="h-3 w-full motion-safe:animate-pulse rounded bg-muted/20" />
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function MisCanjesPage() {
  const { result, reload } = useAsyncData(() => getExchangeHistory(), []);

  if (!result) return <Loading />;

  const header = (
    <header className="mb-6">
      <h1 className="text-xl font-medium text-foreground">Mis canjes</h1>
      <p className="mt-1 text-sm text-foreground/75">Revisá tus recompensas canjeadas y pendientes.</p>
    </header>
  );

  if (!result.ok) {
    return (
      <main className="mx-auto flex min-h-svh w-full max-w-107.5 flex-col px-4 pb-12 pt-6">
        {header}
        <ErrorState title="No pudimos cargar tus canjes" />
      </main>
    );
  }

  const exchanges = result.data;
  const firstPending = exchanges.findIndex((exchange) => exchange.state === ExchangeState.PENDING);

  return (
    <main className="mx-auto flex min-h-svh w-full max-w-107.5 flex-col px-4 pb-12 pt-6">
      {header}

      {exchanges.length === 0 ? (
        <EmptyState icon={Gift} title="Todavía no canjeaste ninguna recompensa" description="Cuando canjees puntos por una recompensa, la vas a ver acá." />
      ) : (
        <ul className="flex flex-col gap-3">
          {exchanges.map((exchange, index) => (
            <li key={exchange.id} data-tour={index === firstPending ? "pending-exchange" : index === 0 ? "exchange" : undefined}>
              <ExchangeCard exchange={exchange} onChanged={reload} />
            </li>
          ))}
        </ul>
      )}

      <PageTour
        id="customer-exchanges"
        steps={[
          {
            target: firstPending >= 0 ? "pending-exchange" : "exchange",
            title: "Tus canjes pendientes",
            body: (
              <>
                <p>
                  Cuando canjeás una recompensa, los puntos se descuentan y recibís un <strong>código</strong>. Mostralo en el local: el personal lo valida y
                  confirma la entrega desde el panel.
                </p>
                <p>Mientras siga pendiente, podés cancelarlo y te devolvemos los puntos.</p>
              </>
            ),
          },
          {
            title: "Probalo de punta a punta",
            body: (
              <p>
                Copiá el código de un canje pendiente, abrí el menú <strong>Demo</strong> y andá al panel del negocio: en el apartado <strong>Validación de canjes</strong> podés
                confirmarlo o anularlo y ver el resultado acá.
              </p>
            ),
          },
        ]}
      />
    </main>
  );
}
