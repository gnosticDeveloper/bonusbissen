import { redirect } from "next/navigation";
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

  const [currentUser, storefronts] = await Promise.all([getCurrentUser(), getDashboardStorefronts()]);

  return (
    <DashboardShell orgId={orgId} role={payload.role} currentUser={currentUser.ok ? currentUser.data : null} storefronts={storefronts} activeStorefrontId={payload.sf}>
      {children}
    </DashboardShell>
  );
}
