"use client";

import { Gift } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { ErrorState } from "@/components/error-state";
import { MemberOnlyRewardCard } from "@/components/member-only-reward-card";
import { useMemberStorefront } from "@/components/member-storefront";
import { PageTour } from "@/components/page-tour";
import { getMemberRewards } from "@/lib/demo/actions";
import { useAsyncData } from "@/lib/demo/hooks";

export default function MemberOnlyRewardsPage() {
  const storefront = useMemberStorefront();
  const { result } = useAsyncData(() => getMemberRewards(storefront.id), [storefront.id]);

  const header = (
    <header className="mb-6">
      <h1 className="text-xl font-medium text-foreground">Recompensas</h1>
      <p className="mt-1 text-sm text-foreground/75">Canjeá tus puntos por estas recompensas.</p>
    </header>
  );

  if (result === null) {
    return (
      <main className="mx-auto flex w-full max-w-107.5 flex-col px-4 pt-6">
        {header}
        <ul className="flex flex-col gap-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <li key={i} className="h-28 motion-safe:animate-pulse rounded-3xl bg-muted/20" />
          ))}
        </ul>
      </main>
    );
  }

  if (!result.ok) {
    return (
      <main className="mx-auto flex w-full max-w-107.5 flex-col px-4 pt-6">
        {header}
        <ErrorState icon={Gift} title="No pudimos cargar las recompensas" />
      </main>
    );
  }

  const rewards = result.data;

  return (
    <main className="mx-auto flex w-full max-w-107.5 flex-col px-4 pt-6">
      {header}

      {rewards.length === 0 ? (
        <EmptyState icon={Gift} title="Todavía no hay recompensas disponibles" description="Este negocio va a cargar recompensas pronto." />
      ) : (
        <ul className="flex flex-col gap-3">
          {rewards.map((reward, index) => (
            <li key={reward.id} data-tour={index === 0 ? "member-reward" : undefined}>
              <MemberOnlyRewardCard reward={reward} storefrontId={storefront.id} />
            </li>
          ))}
        </ul>
      )}

      <PageTour
        id="member-rewards"
        steps={[
          {
            target: "member-reward",
            title: "Canjeá una recompensa",
            body: (
              <>
                <p>Tocá una recompensa para ver el detalle y reclamarla. Si te alcanzan los puntos, se descuentan y recibís un código para mostrar en el local.</p>
              </>
            ),
          },
          {
            title: "¿Dónde quedó mi código?",
            body: (
              <p>
                Lo vas a encontrar en <strong>Mis canjes</strong>, en el inicio de la app. Desde ahí también podés cancelarlo mientras esté pendiente.
              </p>
            ),
          },
        ]}
      />
    </main>
  );
}
