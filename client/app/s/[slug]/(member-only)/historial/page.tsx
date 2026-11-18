import { Wallet } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { ErrorState } from "@/components/error-state";
import { MOVEMENT_FILTERS, filterMovements, groupMovementsByMonth, parseMovementFilter } from "@/lib/helpers/movements";
import { getStorefrontDiscoverInfo } from "../../afiliarse/actions";
import { getMemberPoints } from "../inicio/actions";
import { CompactHeader } from "../_components/compact-header";
import { FilterLinks } from "../_components/filter-links";
import { MovementRow } from "../_components/movement-row";
import { getMovementsHistory } from "./actions";

export default async function MemberOnlyUserHistoryPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ tipo?: string | string[] }>;
}) {
  const { slug } = await params;
  const { tipo } = await searchParams;

  const [storefront, pointsResult, result] = await Promise.all([getStorefrontDiscoverInfo(slug), getMemberPoints(slug), getMovementsHistory(slug)]);

  const pointLabel = storefront.pointLabel ?? "puntos";
  const filter = parseMovementFilter(tipo);

  let content: React.ReactNode;
  if (!result.ok) {
    content = <ErrorState title="No pudimos cargar tu historial" />;
  } else if (result.data.length === 0) {
    content = (
      <EmptyState icon={Wallet} title="Todavía no tenés movimientos" description={`Cuando sumes o canjees ${pointLabel} acá, los vas a ver reflejados.`} />
    );
  } else {
    const months = groupMovementsByMonth(filterMovements(result.data, filter));

    content = (
      <>
        <FilterLinks label="Filtrar movimientos" basePath={`/s/${slug}/historial`} param="tipo" options={MOVEMENT_FILTERS} active={filter} />

        {months.length === 0 ? (
          <EmptyState icon={Wallet} title="No hay movimientos de este tipo" description="Probá con otro filtro para ver el resto de tu historial." />
        ) : (
          <div className="flex flex-col">
            {months.map((month) => (
              <section key={month.key} aria-labelledby={`month-${month.key}`} className="flex flex-col pt-4">
                <h2 id={`month-${month.key}`} className="mb-1 text-[13px] font-bold tracking-wider text-foreground/75 uppercase">
                  {month.label}
                </h2>
                <ul>
                  {month.items.map((movement) => (
                    <MovementRow key={movement.id} movement={movement} currentStorefrontName={storefront.name} />
                  ))}
                </ul>
              </section>
            ))}
          </div>
        )}
      </>
    );
  }

  return (
    <main className="mx-auto flex w-full max-w-107.5 flex-col gap-4 px-5 py-5 text-foreground">
      <CompactHeader storefront={storefront} points={pointsResult.ok ? pointsResult.data.points : null} pointLabel={pointLabel} />
      <h1 className="text-[30px] font-bold tracking-[-0.02em]">Historial</h1>
      {content}
    </main>
  );
}
