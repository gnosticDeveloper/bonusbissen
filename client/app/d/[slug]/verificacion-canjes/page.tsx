import RedemptionValidator, { RedemptionValidatorSkeleton } from "@/components/redemption-validator";
import { Tooltip } from "@/components/tooltip";
import ResolvedRedemptionsList, { ResolvedRedemptionsSkeleton } from "@/components/resolved-redemption-list";
import { Suspense } from "react";

export default function ValidationPage() {
  return (
    <main className="mx-auto min-h-0 w-full text-foreground">
      <header className="mb-7 max-w-xl">
        <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-foreground"> Operaciones </p>
        <div className="flex items-center gap-2">
          <h1 className="text-3xl font-semibold tracking-tighter sm:text-4xl"> Validar canjes </h1>
          <Tooltip
            type="modal"
            label="Cómo verificar y resolver canjes"
            title="Cómo verificar un canje"
            description="Revisá el código y elegí qué hacer con la recompensa."
            content={
              <div className="space-y-4 text-sm leading-relaxed text-foreground/80">
                <section className="space-y-1">
                  <h3 className="font-semibold text-foreground">Buscá el código</h3>
                  <p>Pedile al cliente su código de canje e ingresalo en el buscador. Tiene 6 caracteres: los primeros 4 son números, el quinto es una letra y el último es un número (por ejemplo, <strong className="text-primary">1234A5</strong>). Comprobá que el cliente y la recompensa coincidan antes de continuar.</p>
                </section>
                <section className="space-y-1">
                  <h3 className="font-semibold text-foreground">Si vas a entregar la recompensa</h3>
                  <p>Elegí «Confirmar entrega» cuando se la hayas dado al cliente. El canje queda resuelto como entregado.</p>
                </section>
                <section className="space-y-1">
                  <h3 className="font-semibold text-foreground">Si necesitás anular el canje</h3>
                  <p>Elegí «Anular canje» y decidí si querés devolverle los puntos al cliente: la opción de devolución viene marcada, pero podés desmarcarla si corresponde. Después confirmá la anulación. Un canje ya entregado o anulado no se puede resolver de nuevo.</p>
                </section>
              </div>
            }
          />
        </div>
        <p className="mt-2 text-sm leading-6 text-foreground/80"> Verificá el código de una recompensa y confirmá su entrega al cliente. </p>
      </header>
      <div className="grid min-h-0 items-stretch gap-5 lg:grid-cols-2">
        <Suspense fallback={<RedemptionValidatorSkeleton />}>
          <RedemptionValidator />
        </Suspense>
        <Suspense fallback={<ResolvedRedemptionsSkeleton />}>
          <ResolvedRedemptionsList />
        </Suspense>
      </div>
    </main>
  );
}
