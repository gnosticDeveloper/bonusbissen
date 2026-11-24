"use client";

import Link from "next/link";
import { ChevronRight, Gift, MapPin } from "lucide-react";
import { PageTour } from "@/components/page-tour";
import { useMemberStorefront } from "@/components/member-storefront";
import { getMemberRewards, type RewardView } from "@/lib/demo/actions";
import { useAsyncData } from "@/lib/demo/hooks";
import { formatNumber } from "@/lib/helpers/format";

export default function MemberOnlyHomePage() {
  const business = useMemberStorefront();
  const { result } = useAsyncData(() => getMemberRewards(business.id), [business.id]);
  const rewards = result?.ok ? result.data : [];

  return (
    <main className="mx-auto flex w-full max-w-107.5 flex-col gap-8 px-5 pt-6 text-foreground">
      <section className="flex flex-col gap-3" data-tour="member-featured">
        <h2 className="text-lg font-semibold tracking-[-0.03em]">Recompensas destacadas</h2>

        {result === null ? (
          <div className="flex flex-col gap-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-22 motion-safe:animate-pulse rounded-2xl bg-muted/20" />
            ))}
          </div>
        ) : rewards.length > 0 ? (
          <>
            <div className="flex flex-col gap-3">
              {rewards.slice(0, 3).map((reward) => (
                <RewardPreviewCard key={reward.id} reward={reward} pointLabel={business.pointLabel ?? undefined} />
              ))}
            </div>

            <Link
              href={`/s/recompensas?local=${encodeURIComponent(business.id)}`}
              className="flex items-center justify-center gap-1.5 rounded-2xl border border-border py-3 text-sm font-semibold text-foreground transition-colors hover:bg-card"
            >
              Ver todas las recompensas
              <ChevronRight size={16} aria-hidden="true" />
            </Link>
          </>
        ) : (
          <div className="rounded-2xl border border-dashed border-border p-6 text-center text-sm text-foreground/75">Todavía no hay recompensas cargadas.</div>
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

      <PageTour
        id="member-home"
        ready={result !== null}
        steps={[
          {
            target: "member-header",
            title: `El espacio de ${business.orgName}`,
            body: (
              <p>
                Cada negocio tiene su página con su logo, su portada y su color. Si sos el dueño, podés subir los tuyos desde <strong>Mi negocio</strong> en el panel y
                verlos acá al instante.
              </p>
            ),
          },
          {
            target: "member-points",
            title: `Tus puntos en este programa`,
            body: (
              <p>
                Este saldo pertenece al programa de puntos del local. Si el negocio comparte el mismo programa entre varias sucursales, podés sumar en una y
                canjear en otra.
              </p>
            ),
          },
          {
            target: "member-nav",
            title: "Recompensas e historial",
            body: <p>En <strong>Recompensas</strong> canjeás tus puntos y en <strong>Historial</strong> ves cada movimiento: lo que sumaste, lo que canjeaste y lo que venció.</p>,
          },
        ]}
      />
    </main>
  );
}

function RewardPreviewCard({ reward, pointLabel }: { reward: RewardView; pointLabel?: string }) {
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
          {formatNumber(reward.costPoints)} {pointLabel ?? "puntos"}
        </p>
      </div>
    </article>
  );
}
