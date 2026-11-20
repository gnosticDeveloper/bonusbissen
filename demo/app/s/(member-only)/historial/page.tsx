"use client";

import { Wallet } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { ErrorState } from "@/components/error-state";
import { MovementCard } from "@/components/movement-card";
import { useMemberStorefront } from "@/components/member-storefront";
import { PageTour } from "@/components/page-tour";
import { getMovementsHistory } from "@/lib/demo/actions";
import { useAsyncData } from "@/lib/demo/hooks";
import { useDemoState } from "@/lib/demo/store";

export default function MemberOnlyUserHistoryPage() {
  const storefront = useMemberStorefront();
  // Re-read when the ledger changes (e.g. points granted from the panel in another tab).
  const transactions = useDemoState()?.transactions.length;
  const { result } = useAsyncData(() => getMovementsHistory(storefront.id), [storefront.id, transactions]);

  const header = (
    <header className="mb-6">
      <h1 className="text-xl font-medium text-foreground">Historial</h1>
      <p className="mt-1 text-sm text-foreground/75">Revisá tus movimientos.</p>
    </header>
  );

  if (result === null) {
    return (
      <main className="mx-auto flex w-full max-w-107.5 flex-col px-4 pt-6">
        {header}
        <ul className="flex flex-col gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <li key={i} className="h-28 motion-safe:animate-pulse rounded-3xl bg-muted/20" />
          ))}
        </ul>
      </main>
    );
  }

  if (!result.ok) {
    return (
      <main className="mx-auto flex w-full max-w-107.5 flex-col px-4 pt-6">
        {header}
        <ErrorState title="No pudimos cargar tu historial" />
      </main>
    );
  }

  const movements = result.data;
  const expiringIndex = movements.findIndex((movement) => movement.expirationApplicable);

  return (
    <main className="mx-auto flex w-full max-w-107.5 flex-col px-4 pt-6">
      {header}

      {movements.length === 0 ? (
        <EmptyState icon={Wallet} title="Todavía no tenés movimientos" description="Cuando ganes o canjees puntos acá, los vas a ver reflejados." />
      ) : (
        <ul className="flex flex-col gap-3">
          {movements.map((movement, index) => (
            <li key={movement.id} data-tour={index === 0 ? "movement" : index === expiringIndex ? "movement-expiring" : undefined}>
              <MovementCard movement={movement} />
            </li>
          ))}
        </ul>
      )}

      <PageTour
        id="member-history"
        steps={[
          {
            target: "movement",
            title: "Cada movimiento, registrado",
            body: <p>Las sumas, los canjes, las devoluciones y las correcciones que haga el negocio aparecen acá, del más reciente al más antiguo.</p>,
          },
          {
            target: "movement-expiring",
            title: "Puntos con vencimiento",
            body: (
              <p>
                Algunos programas hacen vencer los puntos después de unos meses. El aviso cambia de color a medida que se acerca la fecha, para que los uses
                a tiempo.
              </p>
            ),
          },
        ]}
      />
    </main>
  );
}
