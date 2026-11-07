import { Coins } from "lucide-react";
import { Tooltip } from "@/components/tooltip";
import { CardHeader, CardTitle } from "@/components/ui/card";
import { PointsWorkspace } from "./points-workspace";

export default function PointsManagerPage() {
  return (
    <main className="mx-auto min-h-0 w-full text-foreground">
      <header className="mb-7 lg:mb-3">
        <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-foreground">Programa de fidelización</p>
        <div className="flex items-center gap-2">
          <h1 className="text-3xl font-semibold tracking-tighter sm:text-4xl">Administrar puntos</h1>
          <Tooltip
            type="modal"
            label="Cómo funciona la administración de puntos"
            title="Cómo sumar y restar puntos"
            description="Una guía rápida para registrar movimientos sin sorpresas."
            content={<PointsGuide />}
          />
        </div>
        <p className="mt-2 text-sm leading-6 text-foreground/80">Sumá puntos por compra o realizá movimientos manuales de suma y resta.</p>
      </header>

      <PointsWorkspace header={<RegisterPointsHeader />} />
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
        <p>Buscá al cliente y elegí «Por monto» si hizo una compra: se suma 1 punto por cada $1.000 gastados. Si necesitás hacer un ajuste, elegí «Manual» y después «Sumar». Podés dejar una nota para que quede claro el motivo.</p>
      </section>
      <section className="space-y-1">
        <h3 className="font-semibold text-foreground">¿Todavía no se afilió al comercio?</h3>
        <p>Para sumar o restar puntos, el cliente tiene que estar afiliado a este comercio; si no lo está, el movimiento va a fallar aunque aparezca en el buscador. Pedile que se afilie y, una vez que lo haya hecho, volvé a buscarlo e intentá de nuevo. Si todavía no tiene cuenta, primero tiene que crearla y después afiliarse. No registres los puntos a nombre de otra persona.</p>
      </section>
      <section className="space-y-1">
        <h3 className="font-semibold text-foreground">Para restar puntos</h3>
        <p>Elegí «Manual» y después «Restar». Antes de confirmar, revisá el saldo y anotá el motivo del ajuste para que quede registrado.</p>
      </section>
      <section className="space-y-1">
        <h3 className="font-semibold text-foreground">Si la resta supera el saldo</h3>
        <p>Te vamos a pedir una confirmación extra: si aceptás, el cliente queda con puntos en deuda. Confirmá solo si la corrección corresponde y explicale al cliente qué pasó; los próximos puntos que sume van a compensar primero ese saldo negativo. Si no estás seguro, cancelá y consultá antes de seguir.</p>
      </section>
    </div>
  );
}
