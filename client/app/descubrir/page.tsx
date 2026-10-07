"use client";

import { CitySelect } from "@/components/city-select";
import { BusinessList } from "@/components/business-list";
import { PaginationControls } from "@/components/pagination-controls";
import { useBusinesses } from "@/hooks/use-businesses";
import { useRef, useState } from "react";
import { useSelectedCity } from "@/lib/preference-store";

const PAGE_SIZE = 10;

export default function DescubrirPage() {
  const city = useSelectedCity();
  const [pagination, setPagination] = useState<{ city: string | null; page: number }>({ city: null, page: 0 });
  const listTopRef = useRef<HTMLDivElement>(null);
  const page = pagination.city === city ? pagination.page : 0;

  const { businesses, totalPages, loading, error } = useBusinesses({ size: PAGE_SIZE, city, page });

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
          <PaginationControls page={page} totalPages={totalPages} onPageChange={handlePageChange} disabled={loading} />
        </div>
      )}

      <BusinessList
        businesses={businesses}
        loading={loading}
        error={error}
        emptyMessage={city ? "No encontramos negocios en esta ciudad todavía." : "Todavía no hay negocios cargados."}
      />

      {totalPages > 1 && (
        <div className="px-5 pt-6">
          <PaginationControls page={page} totalPages={totalPages} onPageChange={handlePageChange} disabled={loading} />
        </div>
      )}
    </main>
  );
}
