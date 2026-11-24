"use client";

import { Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { SideMenu } from "@/components/side-menu";
import { MemberOnlyBottomNav } from "@/components/bottom-nav";
import { MemberOnlyHeader } from "@/components/member-only-header";
import { DemoDock } from "@/components/demo-dock";
import { Spinner } from "@/components/spinner";
import { MemberStorefrontProvider } from "@/components/member-storefront";
import { getStorefrontDiscoverInfoSync } from "@/lib/demo/actions";
import { useCustomerSession } from "@/lib/demo/hooks";
import { balanceOf, isMemberOfStorefront } from "@/lib/demo/store";
import { formatNumber } from "@/lib/helpers/format";

function Loading() {
  return (
    <div className="flex min-h-svh items-center justify-center gap-2 bg-background text-sm text-foreground/80">
      <Spinner />
      <span>Cargando...</span>
    </div>
  );
}

export default function MemberOnlyLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<Loading />}>
      <MemberOnlyShell>{children}</MemberOnlyShell>
    </Suspense>
  );
}

function MemberOnlyShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const storefrontId = useSearchParams().get("local") ?? "";
  const { state, customer } = useCustomerSession();
  const storefront = state ? getStorefrontDiscoverInfoSync(state, storefrontId) : null;
  const isMember = Boolean(state && customer && isMemberOfStorefront(state, customer.id, storefrontId));

  // The opposite validation of "afiliarse": non-members are sent to join first.
  useEffect(() => {
    if (!state || !customer) return;
    if (!storefront) router.replace("/b");
    else if (!isMember) router.replace(`/s/afiliarse?local=${encodeURIComponent(storefrontId)}`);
  }, [state, customer, storefront, isMember, storefrontId, router]);

  if (!state || !customer || !storefront || !isMember) return <Loading />;

  const points = storefront.programId ? balanceOf(state, customer.id, storefront.programId) : null;

  return (
    <MemberStorefrontProvider value={storefront}>
      <div className="min-h-svh overflow-x-clip bg-background pb-[calc(5rem+env(safe-area-inset-bottom))]">
        <MemberOnlyHeader storefront={storefront} />

        <div className="mx-auto w-full max-w-107.5 px-5 pt-5">
          <section className="rounded-2xl border border-border bg-card px-5 py-6 text-center text-foreground shadow-sm" data-tour="member-points">
            <p className="text-xs font-medium uppercase tracking-[0.2em] text-foreground/80">Tus {storefront.pointLabel ?? "puntos"}</p>
            <p className="mt-2 text-4xl font-semibold tabular-nums">{points !== null ? formatNumber(points) : "—"}</p>
          </section>
        </div>

        {children}

        <SideMenu backHref="/b" color={storefront.color} />
        <MemberOnlyBottomNav slug={storefront.id} color={storefront.color} />
        <DemoDock side="customer" className="bottom-24" />
      </div>
    </MemberStorefrontProvider>
  );
}
