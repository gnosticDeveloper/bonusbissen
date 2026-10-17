import { redirect } from "next/navigation";
import { dashboardRequest } from "@/lib/api";
import type { Storefront } from "@/lib/types/storefront";
import { getDashboardSessionToken, verifySession } from "@/lib/auth/session";
import { DashboardShell } from "@/components/dashboard-shell";
import { getCurrentUser } from "./actions";
import { getDashboardStorefronts } from "@/app/d/sign-in/actions";

export default async function DashboardRootLayout({ children, params }: { children: React.ReactNode; params: Promise<{ slug: string }> }) {
  const session = await getDashboardSessionToken();
  if (!session) redirect("/d/sign-in");

  const { slug: orgId } = await params;
  const payload = await verifySession(session, "dashboard");
  if (!payload) redirect("/d/sign-in");

  const [currentUser, storefronts, storefrontResult] = await Promise.all([
    getCurrentUser(),
    getDashboardStorefronts(),
    dashboardRequest<Storefront[]>("/storefronts", { cache: "no-store" }),
  ]);
  const activeColor = storefrontResult.ok ? storefrontResult.data.find((storefront) => storefront.id === payload.sf)?.color : null;

  return (
    <DashboardShell orgId={orgId} role={payload.role} currentUser={currentUser.ok ? currentUser.data : null} storefronts={storefronts} activeStorefrontId={payload.sf} activeColor={activeColor}>
      {children}
    </DashboardShell>
  );
}
