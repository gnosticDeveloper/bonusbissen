"use client";

import { useState } from "react";
import { CreateRewardButton } from "@/components/create-reward-button";
import { RewardViewToggle, type RewardView } from "@/components/reward-view-toggle";
import RewardsList from "@/components/rewards-list";
import { SearchParamsPaginationControls } from "@/components/search-params-pagination-controls";
import type { Reward } from "@/lib/types/reward";

type RewardsViewProps = {
  initialView: RewardView;
  isAdmin: boolean;
  page: number;
  rewards: Reward[];
  totalPages: number;
};

export function RewardsView({ initialView, isAdmin, page, rewards, totalPages }: RewardsViewProps) {
  const [view, setView] = useState<RewardView>(initialView);

  return (
    <div className="flex min-h-0 h-full flex-col gap-5">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <header className="max-w-2xl">
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-foreground">Gestión</p>
          <h1 className="text-3xl font-semibold tracking-tighter sm:text-4xl">Recompensas</h1>
          <p className="mt-2 text-sm leading-6 text-foreground/80">
            {isAdmin
              ? "Creá, editá y eliminá las recompensas que tus clientes pueden canjear."
              : "Catálogo de recompensas disponibles (solo lectura)."}
          </p>
        </header>

        <div className="flex w-full flex-col gap-3 sm:flex-row sm:items-center lg:w-auto">
          <RewardViewToggle view={view} onChange={setView} />
          {isAdmin ? <CreateRewardButton /> : null}
        </div>
      </div>

      {totalPages > 1 ? <SearchParamsPaginationControls page={page} totalPages={totalPages} /> : null}

      <RewardsList rewards={rewards} isAdmin={isAdmin} view={view} />
    </div>
  );
}
