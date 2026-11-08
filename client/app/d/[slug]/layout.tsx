import { cookies } from "next/headers";
import { dashboardRequest } from "@/lib/api";
import type { Storefront } from "@/lib/types/storefront";
import { requireDashboardSession } from "@/lib/auth/session";
import { isSidebarCollapsed, SIDEBAR_COOKIE_NAME } from "@/lib/sidebar-preference";
import { DashboardShell } from "@/components/dashboard-shell";
import { getCurrentUser } from "./actions";
import { getDashboardStorefronts } from "@/app/d/sign-in/actions";

export default async function DashboardRootLayout({ children, params }: { children: React.ReactNode; params: Promise<{ slug: string }> }) {
  const payload = await requireDashboardSession();
  const { slug: orgId } = await params;

  // Se lee en el servidor para que el HTML inicial ya salga contraído si corresponde.
  const cookieStore = await cookies();
  const defaultCollapsed = isSidebarCollapsed(cookieStore.get(SIDEBAR_COOKIE_NAME)?.value);

  const [currentUser, storefronts, storefrontResult] = await Promise.all([
    getCurrentUser(),
    getDashboardStorefronts(),
    dashboardRequest<Storefront[]>("/storefronts", { cache: "no-store" }),
  ]);
  const activeColor = storefrontResult.ok ? storefrontResult.data.find((storefront) => storefront.id === payload.sf)?.color : null;

  return (
    <DashboardShell orgId={orgId} role={payload.role} currentUser={currentUser.ok ? currentUser.data : null} storefronts={storefronts} activeStorefrontId={payload.sf} activeColor={activeColor} defaultCollapsed={defaultCollapsed}>
      {children}
    </DashboardShell>
  );
}
