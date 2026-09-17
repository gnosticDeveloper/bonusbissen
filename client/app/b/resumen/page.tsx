import { ExchangesErrorState } from "@/components/exchanges-error-state";
import { EmptyExchangesState } from "@/components/empty-exchanges-state";
import { ExchangeCard } from "@/components/exchange-card";
import { getExchangeHistory } from "./actions";

export default async function MisCanjesPage() {
  const result = await getExchangeHistory();

  if (!result.ok) {
    return (
      <main className="mx-auto flex min-h-svh w-full max-w-107.5 flex-col px-4 pb-12 pt-6">
        <header className="mb-6">
          <h1 className="text-xl font-medium text-foreground">Mis canjes</h1>
          <p className="mt-1 text-sm text-muted">Revisá tus recompensas canjeadas y pendientes.</p>
        </header>

        <ExchangesErrorState />
      </main>
    );
  }

  const exchanges = result.data;

  return (
    <main className="mx-auto flex min-h-svh w-full max-w-107.5 flex-col px-4 pb-12 pt-6">
      <header className="mb-6">
        <h1 className="text-xl font-medium text-foreground">Mis canjes</h1>
        <p className="mt-1 text-sm text-muted">Revisá tus recompensas canjeadas y pendientes.</p>
      </header>

      {exchanges.length === 0 ? (
        <EmptyExchangesState />
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
