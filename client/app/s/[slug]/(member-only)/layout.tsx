import { redirect } from "next/navigation";
import { getMembership } from "@/app/s/[slug]/actions";
import { SideMenu } from "@/components/side-menu";
import { MemberOnlyBottomNav } from "@/components/bottom-nav";
import { MemberOnlyHeader } from "@/components/member-only-header";
import { UserPointsCard } from "@/components/user-points-card";
import { getStorefrontDiscoverInfo } from "../afiliarse/actions";

export default async function MemberOnlyLayout({ children, params }: { children: React.ReactNode; params: Promise<{ slug: string }> }) {
  const { slug: storefrontId } = await params;

  const [isMember, storefront] = await Promise.all([getMembership(storefrontId), getStorefrontDiscoverInfo(storefrontId)]);

  // The opposite validation of "afiliarse". If users are not afiliated to a local business, we can redirect them to the /afiliarse page.
  if (!isMember) redirect(`/s/${storefrontId}/afiliarse`);
  if (!storefront) redirect("/b"); // sin storefront no hay con qué armar el header

  return (
    <div className="min-h-svh bg-background overflow-x-clip">
      <MemberOnlyHeader storefront={storefront} />

      {/* relative + overflow-hidden: contiene el blur decorativo, que antes
              no tenía ancestro posicionado y se escapaba del viewport (causa
              del overflow-x) */}
      <div className="relative isolate mx-auto w-full max-w-107.5 overflow-x-clip px-4 pt-5">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-24 -top-28 z-1 size-72 rounded-full blur-3xl"
          style={{ backgroundColor: `${storefront.color}14` }}
        />

        <div className="relative z-0">
          <UserPointsCard storefrontId={storefrontId} pointLabel={storefront.pointLabel} />
        </div>
      </div>

      {children}

      <SideMenu backHref="/b" backLabel="Volver a mis comercios" color={storefront.color} />
      <MemberOnlyBottomNav slug={storefrontId} color={storefront.color} />
    </div>
  );
}
