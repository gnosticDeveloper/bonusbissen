"use client";

import { BottomNav } from "@/components/bottom-nav";
import { SideMenu } from "@/components/side-menu";
import { useUIStore } from "@/lib/ui-store";
import { useEffect } from "react";

export default function ProfileLayout({ children }: { children: React.ReactNode }) {
  const syncThemeFromDOM = useUIStore((state) => state.syncThemeFromDOM);

  useEffect(() => {
    syncThemeFromDOM();
  }, [syncThemeFromDOM]);

  return (
    <div className="min-h-svh bg-background">
      {children}
      <SideMenu />
      <BottomNav />
    </div>
  );
}
