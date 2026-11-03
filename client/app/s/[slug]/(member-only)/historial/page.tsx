import { Wallet } from "lucide-react";
import { getMovementsHistory } from "./actions";
import { EmptyState } from "@/components/empty-state";
import { ErrorState } from "@/components/error-state";
import { MovementCard } from "@/components/movement-card";

export default async function MemberOnlyUserHistoryPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const result = await getMovementsHistory(slug);

  if (!result.ok) {
    return (
      <main className="mx-auto flex w-full max-w-107.5 flex-col px-4 pt-6">
        <header className="mb-6">
          <h1 className="text-xl font-medium text-foreground">Historial</h1>
          <p className="mt-1 text-sm text-foreground/75">Revisá tus movimientos.</p>
        </header>

        <ErrorState title="No pudimos cargar tu historial" />
      </main>
    );
  }

  const movements = result.data;

  return (
    <main className="mx-auto flex w-full max-w-107.5 flex-col px-4 pt-6">
      <header className="mb-6">
        <h1 className="text-xl font-medium text-foreground">Historial</h1>
        <p className="mt-1 text-sm text-foreground/75">Revisá tus movimientos.</p>
      </header>

      {movements.length === 0 ? (
        <EmptyState icon={Wallet} title="Todavía no tenés movimientos" description="Cuando ganes o canjees puntos acá, los vas a ver reflejados." />
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
