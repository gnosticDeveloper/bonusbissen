import { ChevronRight, Gift, MapPin } from "lucide-react";
import { getBusinessByStorefrontId } from "./actions";
import Link from "next/link";
import { resolveAssetUrl } from "@/lib/helpers/assets";
import { Reward } from "@/lib/types/reward";

export default async function MemberOnlyHomePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug: storefrontId } = await params;
  const result = await getBusinessByStorefrontId(storefrontId);

  if (!result.ok) {
    return <div className="px-5 py-8 text-sm text-muted">No pudimos cargar la información del negocio.</div>;
  }

  const business = result.data;

  return (
    <main
      className="relative mx-auto flex w-full max-w-107.5 flex-col gap-8 overflow-hidden px-5 py-7 text-foreground"
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
          <p className="mb-2 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted">
            <span aria-hidden="true" className="size-1.5 shrink-0 rounded-full" style={{ backgroundColor: "var(--business-color)" }} />
            Sobre el negocio
          </p>
          <p className="mt-2 text-sm leading-6 text-foreground">{business.description}</p>
        </section>
      )}

      {business.address && (
        <section className="flex items-start gap-3 border-b border-border pb-5 text-sm text-muted">
          <span
            className="grid size-9 shrink-0 place-items-center rounded-xl border text-foreground"
            style={{ backgroundColor: "var(--business-soft)", borderColor: "var(--business-border)" }}
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

      <section className="flex flex-col gap-3 pb-18">
        <h2 className="text-lg font-semibold tracking-[-0.03em] text-foreground">Recompensas destacadas</h2>

        {business.rewards.length > 0 ? (
          <>
            <div className="flex flex-col gap-3">
              {business.rewards.slice(0, 3).map((reward) => (
                <RewardPreviewCard key={reward.id} reward={reward} pointLabel={business.pointLabel} />
              ))}
            </div>

            <Link
              href={`/s/${storefrontId}/recompensas`}
              className="flex items-center justify-center gap-1.5 rounded-2xl border border-border py-3 text-sm font-semibold text-foreground transition-colors hover:bg-card"
            >
              Ver todas las recompensas
              <ChevronRight size={16} aria-hidden="true" />
            </Link>
          </>
        ) : (
          <div className="rounded-2xl border border-dashed border-border p-6 text-center text-sm text-muted">
            Todavía no hay recompensas cargadas.
          </div>
        )}
      </section>
    </main>
  );
}

function RewardPreviewCard({ reward, pointLabel }: { reward: Reward; pointLabel?: string }) {
  const imageUrl = resolveAssetUrl(reward.imagePath);

  return (
    <article className="flex items-center gap-3 rounded-2xl border border-border bg-card p-3">
      <div className="grid size-16 shrink-0 place-items-center overflow-hidden rounded-xl bg-background">
        {imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={imageUrl} alt="" className="size-full object-cover" />
        ) : (
          <Gift className="size-6 text-muted" aria-hidden="true" />
        )}
      </div>

      <div className="min-w-0 flex-1">
        <h3 className="truncate text-sm font-semibold tracking-[-0.02em] text-foreground">{reward.title}</h3>
        {reward.description && <p className="mt-0.5 truncate text-xs text-muted">{reward.description}</p>}
        <p className="mt-1.5 text-xs font-semibold text-foreground">
          {reward.costPoints} {pointLabel ?? "puntos"}
        </p>
      </div>
    </article>
  );
}
