"use client";

import { useRef, useState } from "react";
import { CitySelect } from "@/components/city-select";
import { BusinessList } from "@/components/business-list";
import { PaginationControls } from "@/components/pagination-controls";
import { PageTour } from "@/components/page-tour";
import { getBusinesses } from "@/lib/demo/actions";
import { useAsyncData } from "@/lib/demo/hooks";
import { useSelectedCity } from "@/lib/preferences/city-store";

const PAGE_SIZE = 10;

export default function DescubrirPage() {
  const city = useSelectedCity();
  const [pagination, setPagination] = useState<{ city: string | null; page: number }>({ city: null, page: 0 });
  const listTopRef = useRef<HTMLDivElement>(null);
  const page = pagination.city === city ? pagination.page : 0;

  const { result } = useAsyncData(() => getBusinesses({ size: PAGE_SIZE, city, page }), [city, page]);
  const loading = result === null;
  const businesses = result?.ok ? result.data.items : [];
  const totalPages = result?.ok ? result.data.totalPages : 0;

  function handlePageChange(nextPage: number) {
    setPagination({ city, page: nextPage });
    listTopRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  return (
    <main className="flex min-h-full w-full flex-col">
      <section className="mb-5 px-5">
        <span className="mb-1 block text-[10px] font-bold tracking-[0.08em] text-foreground/75 uppercase">Comercios afiliados</span>
        <div className="flex items-end justify-between gap-4">
          <div className="min-w-0">
            <h1 className="text-[28px] leading-tight font-semibold tracking-[-1px] text-foreground">Explorá Bonus Bissen</h1>
            <p className="mt-1 max-w-75 text-sm leading-5 text-foreground/75">
              Encontrá negocios, conocé sus recompensas y elegí dónde sumar tus próximos puntos.
            </p>
          </div>
        </div>
      </section>

      <section className="mb-5 flex items-center justify-between gap-3 border-y border-border bg-card/45 px-5 py-3" aria-label="Filtros de negocios">
        <div className="min-w-0">
          <span className="block text-[10px] font-bold tracking-[0.08em] text-foreground/75 uppercase">Ubicación</span>
          <p className="truncate text-sm font-medium text-foreground">{city ? `Negocios en ${city}` : "Todas las zonas"}</p>
        </div>
        <CitySelect />
      </section>

      <div ref={listTopRef} className="scroll-mt-4" />

      {totalPages > 1 && (
        <div className="px-5 pb-5">
          <PaginationControls page={page} totalPages={totalPages} onPageChange={handlePageChange} disabled={loading} label="Paginación de negocios" />
        </div>
      )}

      <BusinessList
        businesses={businesses}
        loading={loading}
        error={result !== null && !result.ok}
        emptyMessage={city ? "No encontramos negocios en esta ciudad todavía." : "Todavía no hay negocios cargados."}
      />

      {totalPages > 1 && (
        <div className="px-5 pt-6">
          <PaginationControls page={page} totalPages={totalPages} onPageChange={handlePageChange} disabled={loading} label="Paginación de negocios" />
        </div>
      )}

      <PageTour
        id="customer-discover"
        ready={!loading}
        steps={[
          {
            target: "business-card",
            title: "Todos los negocios en un lugar",
            body: (
              <p>
                Acá aparecen todas las sucursales que usan Bonus Bissen. Las sucursales nuevas que crees desde el panel del negocio también se suman a esta
                lista.
              </p>
            ),
          },
          {
            target: "city-select",
            title: "Elegí una zona",
            body: <p>Filtrá por ciudad para encontrar dónde sumar tus próximos puntos.</p>,
          },
        ]}
      />
    </main>
  );
}
