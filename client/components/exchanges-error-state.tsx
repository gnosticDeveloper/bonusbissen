import { AlertCircle, RotateCcw } from "lucide-react";

export function ExchangesErrorState() {
  return (
    <div className="rounded-3xl border border-border bg-card px-6 py-10 text-center shadow-[0_16px_40px_rgba(20,16,25,0.06)]">
      <div className="mx-auto mb-4 grid h-12 w-12 place-items-center rounded-2xl bg-primary/10 text-primary">
        <AlertCircle className="h-6 w-6" aria-hidden="true" />
      </div>

      <p className="text-sm font-semibold text-foreground">
        No pudimos cargar tus canjes
      </p>

      <p className="mx-auto mt-2 max-w-55 text-xs leading-5 text-muted-foreground">
        Probá de nuevo en un rato.
      </p>

      <div className="mx-auto mt-5 flex w-fit items-center gap-2 rounded-full border border-border bg-background px-3 py-1.5 text-[11px] font-medium text-muted-foreground">
        <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
        Reintentar más tarde
      </div>
    </div>
  );
}
