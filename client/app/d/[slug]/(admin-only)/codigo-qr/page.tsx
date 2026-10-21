import { redirect } from "next/navigation";
import { getDashboardSessionToken, verifySession } from "@/lib/auth/session";
import { getDashboardStorefronts } from "@/app/d/sign-in/actions";
import { QRCodePreview } from "./qr-code-preview";

export default async function StorefrontQRCodePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const session = await getDashboardSessionToken();
  if (!session) redirect("/d/sign-in");
  const payload = await verifySession(session, "dashboard");
  if (!payload) redirect("/d/sign-in");
  if (payload.sf && payload.sf !== slug) redirect(`/d/${payload.sf}/codigo-qr`);

  const storefrontId = payload.sf;
  if (!storefrontId) {
    return <p className="text-sm text-foreground/75">Seleccioná un local para generar su código QR.</p>;
  }

  const storefronts = await getDashboardStorefronts();
  const name = storefronts.find((storefront) => storefront.id === storefrontId)?.name;

  return (
    <main className="mx-auto w-full max-w-2xl text-foreground">
      <header className="mb-7">
        <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.18em]">Panel de administración</p>
        <h1 className="text-3xl font-semibold tracking-tighter sm:text-4xl">Código QR de afiliación</h1>
        <p className="mt-2 text-sm leading-6 text-foreground/80">
          Compartí este código para que tus clientes se sumen a {name ?? "tu local"}. Si cambiás de local en el panel, su código QR también cambiará.
        </p>
      </header>
      <QRCodePreview storefrontId={storefrontId} />
    </main>
  );
}
