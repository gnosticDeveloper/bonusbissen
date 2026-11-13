"use client";

import { DashboardShell } from "@/components/dashboard-shell";
import { Spinner } from "@/components/spinner";
import { dashboardStorefronts } from "@/lib/demo/actions";
import { useStaffSession } from "@/lib/demo/hooks";

export default function DashboardRootLayout({ children }: { children: React.ReactNode }) {
  const { state, staff } = useStaffSession();

  if (!state || !staff) {
    return (
      <div className="flex h-svh items-center justify-center gap-2 bg-background text-sm text-foreground/80">
        <Spinner />
        <span>Cargando panel...</span>
      </div>
    );
  }

  const { member, storefrontId } = staff;
  const activeColor = state.storefronts.find((storefront) => storefront.id === storefrontId)?.color;

  return (
    <DashboardShell
      orgId={storefrontId}
      role={member.role}
      currentUser={{ username: member.username, name: member.name, role: member.role, email: member.email, emailVerified: member.emailVerified }}
      storefronts={dashboardStorefronts(state)}
      activeStorefrontId={storefrontId}
      activeColor={activeColor}
    >
      {children}
    </DashboardShell>
  );
}
