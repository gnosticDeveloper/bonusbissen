"use client";

import { CitySelect } from "@/components/city-select";
import { BusinessList } from "@/components/business-list";
import { PaginationControls } from "@/components/pagination-controls";
import { useBusinesses } from "@/hooks/use-businesses";
import { useRef, useState } from "react";

const PAGE_SIZE = 10;

export default function DescubrirPage() {
  const [city, setCity] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const listTopRef = useRef<HTMLDivElement>(null);

  const { businesses, totalPages, loading, error } = useBusinesses({ size: PAGE_SIZE, city, page });

  function handleCityChange(nextCity: string | null) {
    setCity(nextCity);
    setPage(0);
  }

  function handlePageChange(nextPage: number) {
    setPage(nextPage);
    listTopRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  return (
    <div className="mx-auto flex min-h-svh w-full max-w-107.5 flex-col px-4 pb-12 pt-6">
      <header className="mb-6">
        <h1 className="text-xl font-medium text-foreground">Descubrí negocios</h1>
        <p className="mt-1 text-sm text-muted">Todos los comercios afiliados a BonusBissen.</p>
      </header>

      <div className="mb-5">
        <CitySelect value={city} onChange={handleCityChange} />
      </div>

      <div ref={listTopRef} />

      {totalPages > 1 && (
        <PaginationControls page={page} totalPages={totalPages} onPageChange={handlePageChange} disabled={loading} className="mb-4" />
      )}

      <BusinessList
        businesses={businesses}
        loading={loading}
        error={error}
        emptyMessage={city ? "No encontramos negocios en esta ciudad todavía." : "Todavía no hay negocios cargados."}
      />

      {totalPages > 1 && (
        <PaginationControls page={page} totalPages={totalPages} onPageChange={handlePageChange} disabled={loading} className="mt-6" />
      )}
    </div>
  );
}
