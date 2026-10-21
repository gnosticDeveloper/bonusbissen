import { ChevronRight, Gift, MapPin } from "lucide-react";
import { getBusinessByStorefrontId } from "./actions";
import Link from "next/link";
import { Reward } from "@/lib/types/reward";

export default async function MemberOnlyHomePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug: storefrontId } = await params;
  const result = await getBusinessByStorefrontId(storefrontId);

  if (!result.ok) {
    return <div className="px-5 py-8 text-sm text-foreground/75">No pudimos cargar la información del negocio.</div>;
  }

  const business = result.data;

  return (
    <main className="mx-auto flex w-full max-w-107.5 flex-col gap-8 px-5 pt-6 text-foreground">
      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold tracking-[-0.03em]">Recompensas destacadas</h2>

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
          <div className="rounded-2xl border border-dashed border-border p-6 text-center text-sm text-foreground/75">
            Todavía no hay recompensas cargadas.
          </div>
        )}
      </section>

      {business.description && (
        <section className="rounded-2xl border border-border bg-card p-5">
          <h2 className="mb-2 text-sm font-semibold">Sobre el negocio</h2>
          <p className="text-sm leading-6 text-foreground/80">{business.description}</p>
        </section>
      )}

      {business.address?.street && (
        <section className="flex items-start gap-3 text-sm text-foreground/75">
          <MapPin className="mt-0.5 size-5 shrink-0" aria-hidden="true" />
          <div>
            <h2 className="mb-1 font-semibold text-foreground">Dónde encontrarnos</h2>
            <p>
              {business.address.street}, {business.address.city}
              {business.address.province ? `, ${business.address.province}` : ""}
            </p>
          </div>
        </section>
      )}
    </main>
  );
}

function RewardPreviewCard({ reward, pointLabel }: { reward: Reward; pointLabel?: string }) {
  const imageUrl = reward.imageThumbnailUrl;

  return (
    <article className="flex items-center gap-3 rounded-2xl border border-border bg-card p-3">
      <div className="grid size-16 shrink-0 place-items-center overflow-hidden rounded-xl bg-background">
        {imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={imageUrl} alt="" className="size-full object-cover" />
        ) : (
          <Gift className="size-6 text-foreground/75" aria-hidden="true" />
        )}
      </div>

      <div className="min-w-0 flex-1">
        <h3 className="truncate text-sm font-semibold tracking-[-0.02em] text-foreground">{reward.title}</h3>
        {reward.description && <p className="mt-0.5 truncate text-xs text-foreground/75">{reward.description}</p>}
        <p className="mt-1.5 text-xs font-semibold text-foreground">
          {reward.costPoints} {pointLabel ?? "puntos"}
        </p>
      </div>
    </article>
  );
}
