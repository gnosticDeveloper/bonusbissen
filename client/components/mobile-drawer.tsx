"use client";

import { Button } from "@/components/ui/button";
import { X } from "lucide-react";
import Sidebar from "@/components/sidebar";
import { useEmployeeAuth } from "@/providers/auth-provider";
import { useMobileDrawer } from "@/providers/mobile-drawer-provider";

export function MobileDrawer({ orgId }: { orgId: string; }) {
  const { isOpen, close } = useMobileDrawer();
  const user = useEmployeeAuth();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 lg:hidden">
      <div className="absolute inset-0 bg-foreground/40" onClick={close} aria-hidden />
      <div className="absolute inset-y-0 left-0 flex w-72 flex-col bg-card shadow-xl">
        <div className="flex h-14 items-center justify-between border-b border-border px-4">
          <span className="font-serif text-base font-semibold text-foreground">{user?.name ?? "Invitado"}</span>
          <Button variant="ghost" size="icon" onClick={close} aria-label="Cerrar menú">
            <X className="size-5" />
          </Button>
        </div>
        <div className="flex-1 overflow-y-auto p-3">
          <Sidebar orgId={orgId} onNavigate={close} />
        </div>
      </div>
    </div>
  );
}
