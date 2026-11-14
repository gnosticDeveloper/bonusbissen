"use client";

import { Coins } from "lucide-react";
import { Tooltip } from "@/components/tooltip";
import { CardHeader, CardTitle } from "@/components/ui/card";
import { PageTour } from "@/components/page-tour";
import { useStaffSession } from "@/lib/demo/hooks";
import { programOfStorefront } from "@/lib/demo/store";
import { PointsWorkspace } from "./points-workspace";

export default function PointsManagerPage() {
  const { state, staff } = useStaffSession();
  const program = state && staff ? programOfStorefront(state, staff.storefrontId) : null;
  const unit = program?.unitLabel ?? "puntos";

  return (
    <main className="mx-auto min-h-0 w-full text-foreground">
      <header className="mb-7 lg:mb-3">
        <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-foreground">Programa de fidelización</p>
        <div className="flex items-center gap-2">
          <h1 className="text-3xl font-semibold tracking-tighter sm:text-4xl">Administrar puntos</h1>
          <span data-tour="help-button" className="inline-flex">
            <Tooltip
              type="modal"
              label="Cómo funciona la administración de puntos"
              title="Cómo sumar y restar puntos"
              description="Una guía rápida para registrar movimientos sin sorpresas."
              content={<PointsGuide />}
            />
          </span>
        </div>
        <p className="mt-2 text-sm leading-6 text-foreground/80">Sumá puntos por compra o realizá movimientos manuales de suma y resta.</p>
      </header>

      <PointsWorkspace key={staff?.storefrontId} header={<RegisterPointsHeader />} />

      <PageTour
        id="panel-points"
        ready={Boolean(staff)}
        steps={[
          {
            target: "customer-search",
            title: "Buscá al cliente",
            body: (
              <>
                <p>
                  Para sumar puntos a un cliente tenés que buscarlo, seleccionarlo y alignar la cantidad de puntos correspondiente. Probá escribiendo <strong>Sofía</strong>: al lado vas a ver sus puntos en el programa de
                  este local.
                </p>
                <p>
                  Si aparece <strong>Saldo no disponible</strong>, la persona no está afiliada a este local: el cliente debe primero estar afiliado para así sumarle puntos.
                </p>
              </>
            ),
          },
          {
            target: "grant-mode",
            title: "Por monto o manual",
            body: (
              <p>
                <strong>Por monto</strong> convierte la compra en puntos: 1 punto por cada $1.000. <strong>Manual</strong> te deja sumar o restar una cantidad exacta, por ejemplo para
                corregir un error. Si una resta excede la cantidad de puntos actual del cliente, te pedimos confirmar la deuda. En cuyo caso, el cliente quedará con puntos negativos.
              </p>
            ),
          },
          {
            target: "points-history",
            title: "Historial y correcciones",
            body: (
              <p>
                Cada movimiento queda registrado junto con quién lo hizo. Con el lápiz registrás una corrección: no se borra el original, se agrega un ajuste que
                después aparece en la auditoría y en el historial del cliente.
              </p>
            ),
          },
          {
            target: "help-button",
            title: "¿Dudas? Tocá el ?",
            body: <p>En las páginas con más reglas vas a encontrar este botón con una explicación detallada, igual que en la versión real.</p>,
          },
        ]}
      />
    </main>
  );
}

function RegisterPointsHeader() {
  return (
    <CardHeader className="border-b border-border px-5 py-5 sm:px-6">
      <CardTitle className="flex items-center gap-3 text-base tracking-[-0.02em]">
        <span className="grid size-10 place-items-center rounded-2xl bg-primary/10 text-foreground">
          <Coins className="size-5" aria-hidden="true" />
        </span>
        <span>
          <span className="block">Registrar puntos</span>
          <span className="mt-1 block text-xs font-normal text-foreground/80">Elegí un cliente y registrá su movimiento.</span>
        </span>
      </CardTitle>
    </CardHeader>
  );
}

function PointsGuide() {
  return (
    <div className="space-y-4 text-sm leading-relaxed text-foreground/80">
      <section className="space-y-1">
        <h3 className="font-semibold text-foreground">Para sumar puntos</h3>
        <p>
          Buscá al cliente y elegí <strong>Por monto</strong> si hizo una compra: se suma 1 punto por cada $1.000 gastados. Si necesitás hacer un ajuste, elegí <strong>Manual</strong> y
          después <strong>Sumar</strong>. Podés dejar una nota para que quede claro el motivo.
        </p>
      </section>
      <section className="space-y-1">
        <h3 className="font-semibold text-foreground">¿Todavía no se afilió al comercio?</h3>
        <p>
          Para sumar o restar puntos, el cliente tiene que estar afiliado a este comercio; si no lo está, el movimiento va a fallar aunque aparezca en el
          buscador. Pedile que se afilie y, una vez que lo haya hecho, volvé a buscarlo e intentá de nuevo. Si todavía no tiene cuenta, primero tiene que
          crearla y después afiliarse. No registres los puntos a nombre de otra persona.
        </p>
      </section>
      <section className="space-y-1">
        <h3 className="font-semibold text-foreground">Para restar puntos</h3>
        <p>Elegí <strong>Manual</strong> y después <strong>Restar</strong>. Antes de confirmar, revisá el saldo y anotá el motivo del ajuste para que quede registrado.</p>
      </section>
      <section className="space-y-1">
        <h3 className="font-semibold text-foreground">Si la resta supera el saldo</h3>
        <p>
          Te vamos a pedir una confirmación extra: si aceptás, el cliente queda con puntos en deuda. Confirmá solo si la corrección corresponde y explicale al
          cliente qué pasó; los próximos puntos que sume van a compensar primero ese saldo negativo. Si no estás seguro, cancelá y consultá antes de seguir.
        </p>
      </section>
    </div>
  );
}
