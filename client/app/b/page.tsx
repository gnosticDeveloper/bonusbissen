"use client";

import { useEffect, useState } from "react";
import { PointsCard } from "@/components/points-card";
import { BusinessList } from "@/components/business-list";

import { PointsResponse } from "@/lib/types/customer";
import { getPoints } from "@/app/b/actions";
import { CitySelect } from "@/components/city-select";
import { useBusinesses } from "@/hooks/use-businesses";
import { useSelectedCity } from "@/lib/preferences/city-store";
import { CustomerHeader } from "@/components/customer-header";

export default function MainHomePage() {
  const [points, setPoints] = useState<PointsResponse | null>(null);
  const [pointsError, setPointsError] = useState(false);
  const [pointsAttempt, setPointsAttempt] = useState(0);
  const selectedCity = useSelectedCity();

  const { businesses, loading, error } = useBusinesses({ size: 3, city: selectedCity, page: 0 });

  useEffect(() => {
    let active = true;
    getPoints()
      .then((result) => {
        if (!active) return;
        if (result.ok) setPoints(result.data);
        else setPointsError(true);
      })
      .catch(() => {
        if (active) setPointsError(true);
      });
    return () => {
      active = false;
    };
  }, [pointsAttempt]);

  function retryPoints() {
    setPointsError(false);
    setPointsAttempt((attempt) => attempt + 1);
  }

  return (
    <main className="relative mx-auto min-h-screen w-full max-w-107.5 overflow-hidden bg-background sm:border-x sm:border-border">
      <CustomerHeader />

      <PointsCard points={points} error={pointsError} onRetry={retryPoints} />

      <section className="relative px-5 mb-3.75 flex items-center justify-between gap-3">
        <div className="min-w-0">
          <span className="mb-1 block text-[10px] font-bold tracking-[0.08em] text-foreground/75 uppercase">Explorá cerca tuyo</span>
          <h2 className="m-0 truncate text-[21px] tracking-[-0.8px] text-foreground">
            {selectedCity ? `Ahora en ${selectedCity}` : "Descubrí negocios"}
          </h2>
        </div>
        <CitySelect />
      </section>

      <BusinessList
        businesses={businesses}
        loading={loading}
        error={error}
        emptyMessage={selectedCity ? "No encontramos negocios en esta ciudad todavía." : "Todavía no hay negocios cargados."}
      />
    </main>
  );
}
