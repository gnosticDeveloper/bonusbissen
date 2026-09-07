"use client";

import { useEffect, useState } from "react";
import { Bell, Menu, ChevronRight, UserRound } from "lucide-react";
import { PointsCard } from "@/components/points-card";
import { BusinessList } from "@/components/business-list";
import { useUserStore } from "@/lib/user-store";
import { useUIStore } from "@/lib/ui-store";
import { NearbyBusiness, PointsResponse } from "@/lib/definitions";
import { getNearbyBusinesses, getPoints } from "@/app/b/actions";

export default function MainHomePage() {
  const user = useUserStore((state) => state.user);
  const openMenu = useUIStore((state) => state.openMenu);

  const [points, setPoints] = useState<PointsResponse | null>(null);
  const [pointsError, setPointsError] = useState(false);
  const [businesses, setBusinesses] = useState<NearbyBusiness[]>([]);
  const [businessesLoading, setBusinessesLoading] = useState(true);
  const [businessesError, setBusinessesError] = useState(false);

  useEffect(() => {
    let active = true;
    Promise.all([getPoints(), getNearbyBusinesses()]).then(([pointsResult, businessesResult]) => {
      if (!active) return;
      if (pointsResult.ok) setPoints(pointsResult.data);
      else setPointsError(true);
      if (businessesResult.ok) setBusinesses(businessesResult.data);
      else setBusinessesError(true);
      setBusinessesLoading(false);
    });
    return () => {
      active = false;
    };
  }, []);

  return (
    <main className="relative mx-auto min-h-screen w-full max-w-107.5 overflow-hidden bg-background px-5 pt-6 pb-26 transition-colors duration-240 sm:border-x sm:border-border">
      <header className="relative z-1 mb-6.5 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="grid h-10 w-10 place-items-center rounded-full border-2 border-background bg-primary text-white shadow-[0_0_0_1px_var(--primary)]">
            {user?.avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={user.avatarUrl} alt="" className="h-full w-full rounded-full object-cover" />
            ) : (
              <UserRound size={17} />
            )}
          </div>
          <div>
            <span className="mb-1 block text-[10px] font-bold tracking-[0.08em] text-muted uppercase">Buen día</span>
            <strong className="block text-sm tracking-[-0.2px] text-foreground">{user?.name ?? "Tu cuenta"}</strong>
          </div>
        </div>
        <div className="relative z-1 flex items-center gap-1.5">
          <button
            aria-label="Notificaciones"
            className="grid h-9 w-9 place-items-center rounded-full border border-border bg-card text-foreground transition-colors duration-240"
          >
            <Bell size={19} />
          </button>
          <button
            aria-label="Abrir menú"
            onClick={openMenu}
            className="grid h-9 w-9 place-items-center rounded-full border border-border bg-card text-foreground transition-colors duration-240"
          >
            <Menu size={20} />
          </button>
        </div>
      </header>

      <PointsCard points={pointsError ? null : points} />

      <section className="relative z-1 mb-3.75 flex items-center justify-between">
        <div>
          <span className="mb-1 block text-[10px] font-bold tracking-[0.08em] text-muted uppercase">Explorá cerca tuyo</span>
          <h2 className="m-0 text-[21px] tracking-[-0.8px] text-foreground">Ahora en Palermo</h2>
        </div>
        <button className="flex items-center gap-0.5 border-0 bg-transparent text-[11px] font-bold text-primary">
          Ver todo <ChevronRight size={15} />
        </button>
      </section>

      <BusinessList businesses={businesses} loading={businessesLoading} error={businessesError} />
    </main>
  );
}
