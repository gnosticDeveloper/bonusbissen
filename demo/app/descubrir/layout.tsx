"use client";

import { BottomNav } from "@/components/bottom-nav";
import { CustomerHeader } from "@/components/customer-header";
import { DemoDock } from "@/components/demo-dock";
import { SideMenu } from "@/components/side-menu";
import { useCustomerSession } from "@/lib/demo/hooks";

export default function DiscoverLayout({ children }: { children: React.ReactNode }) {
  const { customer } = useCustomerSession({ required: false });
  const authenticated = Boolean(customer);

  return (
    <div className={`mx-auto min-h-svh w-full max-w-107.5 bg-background sm:border-x sm:border-border ${authenticated ? "pb-26" : "pb-10"}`}>
      <CustomerHeader authenticated={authenticated} />
      {children}
      {authenticated && (
        <>
          <SideMenu />
          <BottomNav />
        </>
      )}
      <DemoDock side="customer" className={authenticated ? "bottom-24" : "bottom-4"} />
    </div>
  );
}
