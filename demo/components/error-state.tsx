import { AlertCircle, RotateCcw, type LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

type ErrorStateProps = {
  title: string;
  description?: string;
  /** Defaults to the alert icon; pass the feature's own icon where it reads better. */
  icon?: LucideIcon;
  /** Shows a "Volver a intentar" button. Only Client Components can pass it. */
  onRetry?: () => void;
};

/**
 * A failed read, shown as a failure. Never render an empty state instead: the
 * difference between "no hay nada" and "no pudimos cargarlo" is the whole point.
 */
export function ErrorState({ title, description = "Probá de nuevo en un rato.", icon: Icon = AlertCircle, onRetry }: ErrorStateProps) {
  return (
    <div
      role="alert"
      className="rounded-3xl border border-border bg-card px-6 py-10 text-center shadow-[0_16px_40px_rgba(20,16,25,0.06)]"
    >
      <div className="mx-auto mb-4 grid h-12 w-12 place-items-center rounded-2xl bg-primary/10 text-foreground">
        <Icon className="h-6 w-6" aria-hidden="true" />
      </div>

      <p className="text-sm font-semibold text-foreground">{title}</p>

      <p className="mx-auto mt-2 max-w-55 text-xs leading-5 text-foreground/80">{description}</p>

      {onRetry ? (
        <Button type="button" variant="outline" size="sm" onClick={onRetry} className="mx-auto mt-5 rounded-full px-3">
          <RotateCcw aria-hidden="true" />
          Volver a intentar
        </Button>
      ) : (
        <div className="mx-auto mt-5 flex w-fit items-center gap-2 rounded-full border border-border bg-background px-3 py-1.5 text-[11px] font-medium text-foreground/80">
          <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
          Reintentar más tarde
        </div>
      )}
    </div>
  );
}
