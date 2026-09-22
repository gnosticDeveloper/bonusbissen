import { MapPin } from "lucide-react";
import { getBusinessByStorefrontId } from "./actions";

export default async function MemberOnlyHomePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug: storefrontId } = await params;
  const result = await getBusinessByStorefrontId(storefrontId);

  if (!result.ok) {
    return <div className="px-5 py-8 text-sm text-muted-foreground">No pudimos cargar la información del negocio.</div>;
  }

  const business = result.data;

  return (
    <main
      className="relative flex flex-col gap-8 overflow-hidden px-5 py-7 text-foreground"
      style={
        {
          "--business-color": business.color,
          "--business-soft": `${business.color}14`,
          "--business-border": `${business.color}35`,
        } as React.CSSProperties
      }
    >
      {business.description && (
        <section
          className="relative rounded-3xl border bg-card p-5 shadow-[0_12px_32px_rgba(25,24,23,0.05)]"
          style={{ borderColor: "var(--business-border)" }}
        >
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.16em]" style={{ color: "var(--business-color)" }}>
            Sobre el negocio
          </p>
          <h2 className="text-lg font-semibold tracking-[-0.03em]">Una forma simple de volver</h2>
          <p className="mt-2 text-sm leading-6 text-foreground">{business.description}</p>
        </section>
      )}

      {business.address && (
        <section className="flex items-start gap-3 border-b border-border pb-5 text-sm text-muted-foreground">
          <span
            className="grid size-9 shrink-0 place-items-center rounded-xl"
            style={{ backgroundColor: "var(--business-soft)", color: "var(--business-color)" }}
          >
            <MapPin className="size-4" aria-hidden="true" />
          </span>
          <div>
            <p className="mb-1 text-xs font-semibold text-foreground">Dónde encontrarnos</p>
            <p>
              {business.address.street}, {business.address.city}
              {business.address.province ? `, ${business.address.province}` : ""}
            </p>
          </div>
        </section>
      )}

      {business.rewards.length > 0 && (
        <article className="overflow-hidden border-b border-border bg-background">
          <header className="flex items-center gap-3 px-5 pb-3">
            <div
              className="grid size-10 shrink-0 place-items-center overflow-hidden rounded-full border border-border bg-card text-base font-semibold text-foreground"
              style={{ borderColor: `${business.color}55` }}
            >
              {business.logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={business.logoUrl} alt="" className="size-full object-cover" />
              ) : (
                business.name.charAt(0).toUpperCase()
              )}
            </div>

            <div className="min-w-0 flex-1">
              <h3 className="truncate text-sm font-semibold tracking-[-0.02em] text-foreground">{business.name}</h3>
              <p className="truncate text-[11px] text-muted">
                {business.address.street} · {business.address.city}
              </p>
            </div>
          </header>
        </article>
      )}
    </main>
  );
}
