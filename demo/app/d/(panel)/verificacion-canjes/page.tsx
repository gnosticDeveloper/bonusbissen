"use client";

import RedemptionValidator from "@/components/redemption-validator";
import ResolvedRedemptionsList from "@/components/resolved-redemption-list";
import { Tooltip } from "@/components/tooltip";
import { PageTour } from "@/components/page-tour";
import { useStaffSession } from "@/lib/demo/hooks";
import { programOfStorefront } from "@/lib/demo/store";
import { ExchangeState } from "@/lib/demo/types";

export default function ValidationPage() {
  const { state, staff } = useStaffSession();
  const program = state && staff ? programOfStorefront(state, staff.storefrontId) : null;
  const pendingCodes = state && program ? state.exchanges.filter((e) => e.programId === program.id && e.state === ExchangeState.PENDING).map((e) => e.code) : [];

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
                  <p>
                    Pedile al cliente su código de canje e ingresalo en el buscador. Tiene 6 caracteres: los primeros 4 son números, el quinto es una letra y el
                    último es un número (por ejemplo, <strong className="text-primary">1234A5</strong>). Comprobá que el cliente y la recompensa coincidan antes
                    de continuar.
                  </p>
                </section>
                <section className="space-y-1">
                  <h3 className="font-semibold text-foreground">Si vas a entregar la recompensa</h3>
                  <p>Elegí «Confirmar entrega» cuando se la hayas dado al cliente. El canje queda resuelto como entregado.</p>
                </section>
                <section className="space-y-1">
                  <h3 className="font-semibold text-foreground">Si necesitás anular el canje</h3>
                  <p>
                    Elegí «Anular canje» y decidí si querés devolverle los puntos al cliente: la opción de devolución viene marcada, pero podés desmarcarla si
                    corresponde. Después confirmá la anulación. Un canje ya entregado o anulado no se puede resolver de nuevo.
                  </p>
                </section>
              </div>
            }
          />
        </div>
        <p className="mt-2 text-sm leading-6 text-foreground/80"> Verificá el código de una recompensa y confirmá su entrega al cliente. </p>
      </header>
      <div className="grid min-h-0 items-stretch gap-5 lg:grid-cols-2">
        <RedemptionValidator key={staff?.storefrontId} />
        <ResolvedRedemptionsList />
      </div>

      <PageTour
        id="panel-redemptions"
        ready={Boolean(staff)}
        steps={[
          {
            target: "code-search",
            title: "Ingresá el código del cliente",
            body: (
              <>
                <p>El cliente te muestra el código desde «Mis canjes». Al buscarlo ves la recompensa, quién la pidió y cuántos puntos costó.</p>
                {pendingCodes.length > 0 ? (
                  <p>
                    Para probar, usá {pendingCodes.length === 1 ? "este código pendiente" : "alguno de estos códigos pendientes"}:{" "}
                    {pendingCodes.map((code, i) => (
                      <span key={code}>
                        {i > 0 ? ", " : ""}
                        <strong className="font-mono tracking-wider text-foreground">{code}</strong>
                      </span>
                    ))}
                    .
                  </p>
                ) : null}
                <p>Un código solo sirve en los locales de su programa de puntos: el de una sucursal con otro programa no se va a encontrar.</p>
              </>
            ),
          },
          {
            target: "resolved-list",
            title: "Entregados y anulados",
            body: (
              <p>
                Al confirmar la entrega o anular el canje, pasa a esta lista con el nombre de quien lo resolvió. Si anulás devolviendo los puntos, el cliente
                los recupera en el acto.
              </p>
            ),
          },
        ]}
      />
    </main>
  );
}
