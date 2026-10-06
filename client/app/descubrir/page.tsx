"use client";

import { CitySelect } from "@/components/city-select";
import { BusinessList } from "@/components/business-list";
import { PaginationControls } from "@/components/pagination-controls";
import { useBusinesses } from "@/hooks/use-businesses";
import { useRef, useState } from "react";
import { useSelectedCity } from "@/lib/preference-store";

const PAGE_SIZE = 10;

export default function DescubrirPage() {
  const [page, setPage] = useState(0);
  const listTopRef = useRef<HTMLDivElement>(null);
  const city = useSelectedCity();

  const { businesses, totalPages, loading, error } = useBusinesses({ size: PAGE_SIZE, city, page });

  function handlePageChange(nextPage: number) {
    setPage(nextPage);
    listTopRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  return (
    <div className="mx-auto flex min-h-full w-full max-w-107.5 flex-col pt-6">
      <header className="mb-6 px-5">
        <h1 className="text-xl font-medium text-foreground">Descubrí negocios</h1>
        <p className="mt-1 text-sm text-muted">Todos los comercios afiliados a BonusBissen.</p>
      </header>

      <div className="mb-5 px-5 self-end">
        <CitySelect />
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
