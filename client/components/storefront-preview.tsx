"use client";

import { useId, useState } from "react";
import { Gift } from "lucide-react";
import { PointsHeroCard } from "@/app/s/[slug]/(member-only)/_components/points-hero-card";
import { StorefrontHero } from "@/app/s/[slug]/(member-only)/_components/storefront-hero";
import { brandColorVars } from "@/lib/helpers/color";
import { cn } from "@/lib/helpers/utils";
import type { Organization } from "@/lib/types/organization";
import type { PointProgram } from "@/lib/types/point-program";
import type { Storefront, StorefrontDiscoverInfo } from "@/lib/types/storefront";

/** Balance shown on the points card. The modal description says it is an example. */
const SAMPLE_POINTS = 1250;

function joinParts(parts: (string | null | undefined)[]): string | null {
  const text = parts.filter(Boolean).join(", ");
  return text || null;
}

/**
 * The customer home of a storefront (`/s/[slug]/inicio`) inside a phone frame, built from the
 * same hero and points card that page renders, so what the admin sees here is what customers get.
 * The content is `inert`: it's a picture of the page, not a page to use.
 */
export function StorefrontPreview({
  org,
  storefronts,
  pointPrograms,
}: {
  org: Organization;
  storefronts: Storefront[];
  pointPrograms: PointProgram[];
}) {
  const pickerName = useId();
  // Customers only see active storefronts.
  const visible = storefronts.filter((sf) => sf.active);
  const [selectedId, setSelectedId] = useState(visible[0]?.id ?? null);
  const selected = visible.find((sf) => sf.id === selectedId) ?? visible[0] ?? null;

  const pointLabel = (selected && pointPrograms.find((pp) => pp.storefronts.some((s) => s.id === selected.id))?.unitLabel) || "puntos";

  const info: StorefrontDiscoverInfo = {
    id: selected?.id ?? "preview",
    name: selected?.name ?? "Tu sucursal",
    orgName: org.name,
    color: selected?.color ?? "",
    iconUrl: selected?.iconUrl ?? null,
    pointLabel,
    orgLogoUrl: org.logoUrl ?? null,
    orgBannerUrl: org.bannerUrl ?? null,
  };
  const location = selected && !selected.online ? joinParts([selected.city, selected.province]) : null;

  return (
    <div className="flex flex-col gap-4">
      {visible.length > 1 && (
        <fieldset className="min-w-0">
          <legend className="mb-2 text-sm font-medium text-foreground">Sucursal</legend>
          <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
            {visible.map((sf) => {
              const active = sf.id === selected?.id;
              return (
                // `relative` keeps the sr-only radio inside the pill: positioned against the modal instead,
                // a pill scrolled out of view pushes the radio past the modal's edge and widens it.
                <label
                  key={sf.id}
                  className={cn(
                    "relative inline-flex h-9 shrink-0 cursor-pointer items-center gap-2 rounded-full border px-3.5 text-sm font-medium transition-colors motion-reduce:transition-none has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-primary",
                    active ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card text-foreground/80 hover:bg-foreground/10 hover:text-foreground",
                  )}
                >
                  <input
                    type="radio"
                    name={pickerName}
                    value={sf.id}
                    checked={active}
                    onChange={() => setSelectedId(sf.id)}
                    className="sr-only"
                  />
                  <span aria-hidden="true" className="size-2.5 rounded-full border border-current/30" style={{ background: sf.color ?? undefined }} />
                  {sf.name}
                </label>
              );
            })}
          </div>
        </fieldset>
      )}

      {visible.length === 0 && (
        <p className="rounded-2xl border border-dashed border-border px-4 py-3 text-sm text-foreground/80">
          Todavía no tenés sucursales activas. Cuando cargues una, vas a ver acá su nombre y su color.
        </p>
      )}

      <div className="mx-auto w-full max-w-94 overflow-hidden rounded-2xl border border-border bg-background shadow-[0_14px_40px_rgba(25,24,23,0.10)] sm:border-[6px] sm:border-foreground/15">
        <div
          role="region"
          aria-label={`Pantalla principal de ${info.name} en el celular`}
          tabIndex={0}
          className="h-[min(38rem,58dvh)] overflow-y-auto overscroll-contain focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-primary"
        >
          <div inert style={brandColorVars(selected?.color)} className="bg-background pb-8">
            <StorefrontHero storefront={info} location={location} />

            <div className="mx-auto flex w-full max-w-107.5 flex-col px-5 py-6 text-foreground">
              <PointsHeroCard points={SAMPLE_POINTS} pointLabel={pointLabel} next={null} allRedeemable={false} historyHref="#" />

              <div className="mt-8 flex flex-col gap-3.5">
                <p className="text-[22px] font-bold tracking-[-0.01em]">Recompensas</p>
                <div className="flex gap-3 overflow-hidden">
                  {[0, 1, 2].map((key) => (
                    <div key={key} className="flex w-42 shrink-0 flex-col overflow-hidden rounded-[20px] border border-border bg-card">
                      <span className="grid h-28 w-full place-items-center bg-brand/15 text-brand-ink">
                        <Gift className="size-7" aria-hidden="true" />
                      </span>
                      <span className="flex flex-col gap-2 px-3 pt-3 pb-3.5">
                        <span className="h-3.5 w-4/5 rounded-full bg-foreground/10" />
                        <span className="h-3 w-1/2 rounded-full bg-brand/30" />
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
