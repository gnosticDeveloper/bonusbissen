"use client";

import { OrganizationSection } from "@/components/organization-section";
import { PageTour } from "@/components/page-tour";
import { PointProgramsSection } from "@/components/point-programs-section";
import { StorefrontsSection } from "@/components/storefronts-section";
import { Tooltip } from "@/components/tooltip";
import { useStaffSession } from "@/lib/demo/hooks";
import { managedOrg } from "@/lib/demo/store";

export default function MiNegocioPage() {
  const { state } = useStaffSession({ adminOnly: true });
  if (!state) return null;

  const org = managedOrg(state);
  const storefronts = state.storefronts.filter((s) => s.orgId === org.id);
  const pointPrograms = state.programs.filter((p) => p.orgId === org.id);

  return (
    <main className="mx-auto w-full max-w-2xl text-foreground min-h-full">
      <header className="mb-7">
        <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-foreground">Panel de administración</p>
        <div className="flex items-center gap-2">
          <h1 className="text-3xl font-semibold tracking-tighter sm:text-4xl">Mi negocio</h1>
          <Tooltip
            type="modal"
            label="Qué son las sucursales y los programas de puntos"
            title="Cómo organizar tu negocio"
            description="Conocé para qué sirve cada sección antes de configurarla."
            content={
              <div className="space-y-4 text-sm leading-relaxed text-foreground/80">
                <section className="space-y-1">
                  <h3 className="font-semibold text-foreground">Sucursales</h3>
                  <p>
                    Son los locales físicos o las tiendas online de tu negocio donde tus clientes se pueden afiliar y sumar puntos. Creá una sucursal para cada
                    lugar que quieras mostrar y gestionar por separado.
                  </p>
                </section>
                <section className="space-y-1">
                  <h3 className="font-semibold text-foreground">Programas de puntos</h3>
                  <p>
                    Te permiten organizar los puntos y ofrecer recompensas para canjearlos. Los puntos pertenecen al programa, no a cada sucursal: si un cliente
                    suma puntos en una sucursal, puede usarlos en cualquiera de las otras sucursales que compartan ese mismo programa. Primero cargá al menos
                    una sucursal activa; después creá un programa y elegí qué sucursales participan. Varias sucursales pueden compartir un programa, pero cada
                    una puede pertenecer a uno solo.
                  </p>
                </section>
              </div>
            }
          />
        </div>
        <p className="mt-2 text-sm leading-6 text-foreground/80">Gestioná los datos de tu negocio, tus sucursales y tus programas de puntos.</p>
      </header>

      <div className="flex flex-col gap-6">
        <OrganizationSection org={org} />
        <StorefrontsSection storefronts={storefronts} />
        <PointProgramsSection pointPrograms={pointPrograms} storefronts={storefronts} />
      </div>

      <PageTour
        id="panel-business"
        steps={[
          {
            target: "org-images",
            title: "Ponele tu marca",
            body: (
              <>
                <p>Subí el logo y la portada de tu negocio: aparecen en la app de clientes, en la lista de negocios y en la página de cada sucursal.</p>
                <p>Las imágenes quedan solo en esta pestaña del navegador. Probá con las tuyas y mirá el resultado desde la app de clientes.</p>
              </>
            ),
          },
          {
            target: "storefronts-section",
            title: "Tus sucursales",
            body: (
              <p>
                Esta demo tiene dos: <strong>Centro</strong> y <strong>Palermo</strong>. Podés editarlas, cambiar su color de marca o crear una nueva; las
                activas aparecen en la app de clientes.
              </p>
            ),
          },
          {
            target: "programs-section",
            title: "Un programa distinto en cada una",
            body: (
              <>
                <p>
                  Centro usa <strong>Club Tu negocio</strong> (puntos sin vencimiento) y Palermo usa <strong>Granos Palermo</strong> (granos que vencen a los 6
                  meses). Por eso un mismo cliente tiene dos saldos separados.
                </p>
                <p>Si asignás las dos sucursales a un mismo programa, los puntos se comparten entre ambas.</p>
              </>
            ),
          },
        ]}
      />
    </main>
  );
}
