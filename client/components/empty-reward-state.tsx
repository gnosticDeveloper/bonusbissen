import { Gift, Sparkles } from "lucide-react";

export function EmptyRewardsState() {
  return (
    <div className="rounded-3xl border border-dashed border-border bg-card/60 px-6 py-10 text-center">
      <div className="relative mx-auto mb-5 grid h-14 w-14 place-items-center rounded-2xl bg-primary/10 text-primary">
        <Gift className="h-6 w-6" aria-hidden="true" />
        <Sparkles className="absolute -right-2 -top-2 h-4 w-4 text-primary" aria-hidden="true" />
      </div>

      <p className="text-sm font-semibold text-foreground">Todavía no hay recompensas disponibles</p>

      <p className="mx-auto mt-2 max-w-61.25 text-xs leading-5 text-muted-foreground">
        Este negocio va a cargar recompensas pronto.
      </p>
    </div>
  );
}
