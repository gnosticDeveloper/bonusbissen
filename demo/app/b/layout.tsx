"use client";

import { BottomNav } from "@/components/bottom-nav";
import { DemoDock } from "@/components/demo-dock";
import { SideMenu } from "@/components/side-menu";
import { Spinner } from "@/components/spinner";
import { useCustomerSession } from "@/lib/demo/hooks";

export default function ProfileLayout({ children }: { children: React.ReactNode }) {
  const { customer } = useCustomerSession();

  if (!customer) {
    return (
      <div className="flex min-h-svh items-center justify-center gap-2 bg-background text-sm text-foreground/80">
        <Spinner />
        <span>Cargando...</span>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100svh-4.375rem)] bg-background pb-26">
      {children}
      <SideMenu />
      <BottomNav />
      <DemoDock side="customer" className="bottom-24" />
    </div>
  );
}
