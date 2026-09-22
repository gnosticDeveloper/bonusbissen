import { redirect } from "next/navigation";
import { decodeJwt, getDashboardSessionToken } from "@/lib/auth/session";
import { DashboardShell } from "@/components/dashboard-shell";
import { getCurrentUser } from "./actions";

export default async function DashboardRootLayout({ children, params }: { children: React.ReactNode; params: Promise<{ slug: string }> }) {
  const session = await getDashboardSessionToken();
  if (!session) redirect("/d/sign-in");

  const { slug: orgId } = await params;
  const payload = decodeJwt(session);

  const currentUser = await getCurrentUser();

  return (
    <DashboardShell orgId={orgId} role={payload.role} currentUser={currentUser.ok ? currentUser.data : null}>
      {children}
    </DashboardShell>
  );
}
