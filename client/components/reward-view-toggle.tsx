"use client";

import { LayoutGrid, List } from "lucide-react";
import { useRouter } from "next/navigation";

type RewardView = "list" | "grid";

export function RewardViewToggle({ view }: { view: RewardView }) {
  const router = useRouter();

  function changeView(nextView: RewardView) {
    document.cookie = `reward-view=${nextView}; Path=/; Max-Age=31536000; SameSite=Lax`;
    router.refresh();
  }

  return (
    <div aria-label="Vista de recompensas" className="flex w-full rounded-xl border border-border bg-card p-1 sm:w-auto" role="group">
      <button
        type="button"
        onClick={() => changeView("grid")}
        aria-pressed={view === "grid"}
        className={`flex flex-1 items-center justify-center gap-2 rounded-lg px-3 text-xs font-semibold transition-colors sm:flex-none ${
          view === "grid" ? "bg-primary text-primary-foreground" : "text-muted hover:bg-muted/10"
        }`}
      >
        <LayoutGrid className="size-4" aria-hidden="true" />
        <span>Cuadrícula</span>
      </button>
      <button
        type="button"
        onClick={() => changeView("list")}
        aria-pressed={view === "list"}
        className={`flex flex-1 items-center justify-center gap-2 rounded-lg px-3 text-xs font-semibold transition-colors sm:flex-none ${
          view === "list" ? "bg-primary text-primary-foreground" : "text-muted hover:bg-muted/10"
        }`}
      >
        <List className="size-4" aria-hidden="true" />
        <span>Lista</span>
      </button>
    </div>
  );
}
