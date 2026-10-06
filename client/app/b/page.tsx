"use client";

import { useEffect, useState } from "react";
import { UserRound } from "lucide-react";
import { PointsCard } from "@/components/points-card";
import { BusinessList } from "@/components/business-list";

import { PointsResponse } from "@/lib/definitions";
import { getPoints } from "@/app/b/actions";
import { CitySelect } from "@/components/city-select";
import { useBusinesses } from "@/hooks/use-businesses";
import { useUser } from "@/providers/user-provider";
import { useSelectedCity } from "@/lib/preference-store";

export default function MainHomePage() {
  const user = useUser();

  const [points, setPoints] = useState<PointsResponse | null>(null);
  const [pointsError, setPointsError] = useState(false);
  const selectedCity = useSelectedCity();

  const { businesses, loading, error } = useBusinesses({ size: 3, city: selectedCity, page: 0 });

  useEffect(() => {
    let active = true;
    getPoints().then((result) => {
      if (!active) return;
      if (result.ok) setPoints(result.data);
      else setPointsError(true);
    });
    return () => {
      active = false;
    };
  }, []);

  return (
    <main className="relative mx-auto min-h-screen w-full max-w-107.5 overflow-hidden bg-background pt-6 transition-colors duration-200 sm:border-x sm:border-border">
      <header className="relative z-1 px-5 mb-6.5 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="grid h-10 w-10 place-items-center rounded-full border-2 border-background bg-primary text-white shadow-[0_0_0_1px_var(--primary)]">
            <UserRound size={17} />
          </div>
          <div>
            <span className="mb-1 block text-[10px] font-bold tracking-[0.08em] text-muted uppercase">Buen día</span>
            <strong className="block text-sm tracking-[-0.2px] text-foreground">{user?.name ?? "Tu cuenta"}</strong>
          </div>
        </div>

      </header>

      <PointsCard points={pointsError ? null : points} />

      <section className="relative px-5 mb-3.75 flex items-center justify-between gap-3">
        <div className="min-w-0">
          <span className="mb-1 block text-[10px] font-bold tracking-[0.08em] text-muted uppercase">Explorá cerca tuyo</span>
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
