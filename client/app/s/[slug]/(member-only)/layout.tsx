import { redirect } from "next/navigation";
import { getMe } from "@/app/b/actions";
import { getMembership } from "@/app/s/[slug]/actions";
import { SideMenu } from "@/components/side-menu";
import { MemberOnlyBottomNav } from "@/components/bottom-nav";
import { brandColorVars } from "@/lib/helpers/color";
import { UserProvider } from "@/providers/user-provider";
import { getStorefrontDiscoverInfo } from "../afiliarse/actions";
import { getMemberPoints } from "./inicio/actions";
import { storefrontLogoUrl } from "./_components/storefront-logo-url";

export default async function MemberOnlyLayout({ children, params }: { children: React.ReactNode; params: Promise<{ slug: string }> }) {
  const { slug: storefrontId } = await params;

  // getStorefrontDiscoverInfo and getMemberPoints are request-cached: the pages read them again for free.
  const [isMember, storefront, me, points] = await Promise.all([
    getMembership(storefrontId),
    getStorefrontDiscoverInfo(storefrontId),
    getMe(),
    getMemberPoints(storefrontId),
  ]);

  // The opposite validation of "afiliarse". If users are not afiliated to a local business, we can redirect them to the /afiliarse page.
  if (!isMember) redirect(`/s/${storefrontId}/afiliarse`);
  if (!storefront) redirect("/b"); // sin storefront no hay con qué armar el header

  return (
    <UserProvider user={me.ok ? me.data : null}>
      <div style={brandColorVars(storefront.color)} className="min-h-svh overflow-x-clip bg-background pb-[calc(6rem+env(safe-area-inset-bottom))]">
        {children}

        <SideMenu
          backHref="/b"
          storefront={{
            name: storefront.orgName,
            logoUrl: storefrontLogoUrl(storefront),
            points: points.ok ? points.data.points : null,
            pointLabel: storefront.pointLabel ?? "puntos",
          }}
        />
        <MemberOnlyBottomNav slug={storefrontId} />
      </div>
    </UserProvider>
  );
}
