"use client";

import { useState } from "react";
import { CreateRewardButton } from "@/components/create-reward-button";
import { RewardViewToggle } from "@/components/reward-view-toggle";
import RewardsList from "@/components/rewards-list";
import { PaginationControls } from "@/components/pagination-controls";
import { PageTour } from "@/components/page-tour";
import { dashboardRewardsSync } from "@/lib/demo/actions";
import { useStaffSession } from "@/lib/demo/hooks";
import { programOfStorefront } from "@/lib/demo/store";
import { UserRole } from "@/lib/demo/types";
import { readCookie } from "@/lib/preferences/cookie";
import { REWARD_VIEW_COOKIE_NAME, rewardViewFrom, type RewardView } from "@/lib/preferences/reward-view";

const PAGE_SIZE = 10;

export default function RewardsPage() {
  const { state, staff } = useStaffSession();
  // The panel only renders after hydration, so the cookie can be read on the first render.
  const [view, setView] = useState<RewardView>(() => rewardViewFrom(readCookie(REWARD_VIEW_COOKIE_NAME)));
  const [pagination, setPagination] = useState({ storefrontId: staff?.storefrontId, page: 0 });
  const page = pagination.storefrontId === staff?.storefrontId ? pagination.page : 0;

  if (!state || !staff) return null;

  const isAdmin = staff.member.role === UserRole.ADMIN;
  const program = programOfStorefront(state, staff.storefrontId);
  const all = dashboardRewardsSync(state);
  const totalPages = Math.ceil(all.length / PAGE_SIZE);
  const rewards = all.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  return (
    <div className="flex min-h-0 h-full flex-col gap-5">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <header className="max-w-2xl">
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-foreground">Gestión</p>
          <h1 className="text-3xl font-semibold tracking-tighter sm:text-4xl">Recompensas</h1>
          <p className="mt-2 text-sm leading-6 text-foreground/80">
            {isAdmin ? "Creá, editá y eliminá las recompensas que tus clientes pueden canjear." : "Catálogo de recompensas disponibles (solo lectura)."}
          </p>
        </header>

        <div className="flex w-full flex-col gap-3 sm:flex-row sm:items-center lg:w-auto">
          <RewardViewToggle view={view} onChange={setView} />
          {isAdmin ? <CreateRewardButton defaultProgramId={program?.id} /> : null}
        </div>
      </div>

      {totalPages > 1 ? (
        <PaginationControls
          page={page}
          totalPages={totalPages}
          onPageChange={(next) => setPagination({ storefrontId: staff.storefrontId, page: next })}
          className="mx-auto mt-6 w-full max-w-xs"
        />
      ) : null}

      <RewardsList rewards={rewards} isAdmin={isAdmin} view={view} />

      <PageTour
        id={isAdmin ? "panel-rewards-admin" : "panel-rewards-cashier"}
        steps={[
          {
            target: "rewards-list",
            title: `El catálogo de ${program?.name ?? "este local"}`,
            body: (
              <p>
                Las recompensas pertenecen a un programa de puntos, no a una sucursal: acá ves las del programa del local en el que estás. Cambiá de local para
                ver las del otro programa.
              </p>
            ),
          },
          ...(isAdmin
            ? [
                {
                  target: "create-reward",
                  title: "Creá tus propias recompensas",
                  body: (
                    <p>
                      Elegí título, costo en puntos, descuento, programa e imagen. Aparecen al instante en el carrusel de la app de clientes. Probá editar o
                      eliminar una y mirá el cambio del lado del cliente.
                    </p>
                  ),
                },
              ]
            : [
                {
                  title: "Modo solo lectura",
                  body: <p>Como cajero podés consultar el catálogo para atender a los clientes, pero solo un administrador puede modificarlo.</p>,
                },
              ]),
          {
            target: "reward-view",
            title: "Cuadrícula o lista",
            body: <p>Elegí cómo ver el catálogo. La preferencia queda guardada en este navegador.</p>,
          },
        ]}
      />
    </div>
  );
}
