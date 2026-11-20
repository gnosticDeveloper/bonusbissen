import { Gift } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { ErrorState } from "@/components/error-state";
import { ExchangeCard } from "@/components/exchange-card";
import { getExchangeHistory } from "@/app/b/resumen/actions";

export default async function MisCanjesPage() {
  const result = await getExchangeHistory();

  if (!result.ok) {
    return (
      <main className="mx-auto flex min-h-svh w-full max-w-107.5 flex-col px-4 pb-12 pt-6">
        <header className="mb-6">
          <h1 className="text-xl font-medium text-foreground">Mis canjes</h1>
          <p className="mt-1 text-sm text-foreground/75">Revisá tus recompensas canjeadas y pendientes.</p>
        </header>

        <ErrorState title="No pudimos cargar tus canjes" />
      </main>
    );
  }

  const exchanges = result.data;

  return (
    <main className="mx-auto flex min-h-svh w-full max-w-107.5 flex-col px-4 pb-12 pt-6">
      <header className="mb-6">
        <h1 className="text-xl font-medium text-foreground">Mis canjes</h1>
        <p className="mt-1 text-sm text-foreground/75">Revisá tus recompensas canjeadas y pendientes.</p>
      </header>

      {exchanges.length === 0 ? (
        <EmptyState icon={Gift} title="Todavía no canjeaste ninguna recompensa" description="Cuando canjees puntos por una recompensa, la vas a ver acá." />
      ) : (
        <ul className="flex flex-col gap-3">
          {exchanges.map((exchange) => (
            <li key={exchange.id}>
              <ExchangeCard exchange={exchange} />
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
