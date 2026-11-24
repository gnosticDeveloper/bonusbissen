"use client";

import { PageTour } from "@/components/page-tour";
import { useStaffSession } from "@/lib/demo/hooks";
import { QRCodePreview } from "./qr-code-preview";

export default function StorefrontQRCodePage() {
  const { state, staff } = useStaffSession();
  if (!state || !staff) return null;

  const name = state.storefronts.find((storefront) => storefront.id === staff.storefrontId)?.name;

  return (
    <main className="mx-auto w-full max-w-2xl text-foreground">
      <header className="mb-7">
        <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.18em]">Panel de administración</p>
        <h1 className="text-3xl font-semibold tracking-tighter sm:text-4xl">Código QR de afiliación</h1>
        <p className="mt-2 text-sm leading-6 text-foreground/80">
          Compartí este código para que tus clientes se sumen a {name ?? "tu local"}. Si cambiás de local en el panel, su código QR también cambiará.
        </p>
      </header>
      <QRCodePreview key={staff.storefrontId} storefrontId={staff.storefrontId} />

      <PageTour
        id="panel-qr"
        steps={[
          {
            target: "qr-card",
            title: "El QR para tu mostrador",
            body: (
              <>
                <p>A este QR lo podes imprimir o mostrar en pantalla: al escanearlo, el cliente llega a la página para sumarse a este local y empezar a juntar puntos.</p>
                <p>En la demo, el enlace abre la pantalla de afiliación de la app de clientes. Probalo desde el enlace debajo del código.</p>
              </>
            ),
          },
        ]}
      />
    </main>
  );
}
