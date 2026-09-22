import { getMovementsHistory } from "./actions";
import { EmptyMovementsState } from "@/components/empty-movements-state";
import { MovementCard } from "@/components/movement-card";
import { MovementsErrorState } from "@/components/movements-error-state";

export default async function MemberOnlyUserHistoryPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const result = await getMovementsHistory(slug);

  if (!result.ok) {
    return (
      <main className="mx-auto flex min-h-svh w-full max-w-107.5 flex-col px-4 pb-12 pt-6">
        <header className="mb-6">
          <h1 className="text-xl font-medium text-foreground">Historial</h1>
          <p className="mt-1 text-sm text-muted">Revisá tus movimientos.</p>
        </header>

        <MovementsErrorState />
      </main>
    );
  }

  const movements = result.data;

  return (
    <main className="mx-auto flex w-full max-w-107.5 flex-col px-4 pb-12 pt-6">
      <header className="mb-6">
        <h1 className="text-xl font-medium text-foreground">Historial</h1>
        <p className="mt-1 text-sm text-muted">Revisá tus movimientos.</p>
      </header>

      {movements.length === 0 ? (
        <EmptyMovementsState />
      ) : (
        <ul className="flex flex-col gap-3">
          {movements.map((exchange) => (
            <li key={exchange.id}>
              <MovementCard movement={exchange} />
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
