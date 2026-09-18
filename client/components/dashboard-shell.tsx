"use client";

import { useEffect, useState } from "react";
import { Menu, X } from "lucide-react";
import type { AdminUserInfo, UserRole } from "@/lib/definitions";
import { cn } from "@/lib/helpers/utils";
import Sidebar, { NAV } from "./sidebar";
import { UserMenu } from "./user-menu";
import { BrandLockup } from "./brand";

type DashboardShellProps = {
  orgId: string;
  role: UserRole;
  currentUser: AdminUserInfo | null;
  children: React.ReactNode;
};

export function DashboardShell({ orgId, role, children, currentUser }: DashboardShellProps) {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  const items = NAV.filter((item) => item.roles.includes(role));

  useEffect(() => {
    if (!isDrawerOpen) return;

    document.body.style.overflow = "hidden";
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIsDrawerOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [isDrawerOpen]);

  return (
    <div className="flex h-svh flex-col lg:flex-row">
      {/* Sidebar fija en desktop */}
      <aside className="hidden w-64 shrink-0 flex-col gap-6 border-r border-border bg-card p-4 lg:flex">
        <BrandLockup />
        <Sidebar orgId={orgId} items={items} onNavigate={() => {}} />
        <div className="mt-auto">
          <UserMenu user={currentUser} />
        </div>
      </aside>

      {/* Header mobile */}
      <header className="flex items-center justify-between border-b border-border bg-card px-4 py-3 lg:hidden">
        <BrandLockup />
        <button
          type="button"
          onClick={() => setIsDrawerOpen(true)}
          aria-label="Abrir menú de navegación"
          aria-expanded={isDrawerOpen}
          className="rounded-lg p-2 text-foreground transition-colors hover:bg-muted"
        >
          <Menu className="size-5" />
        </button>
      </header>

      {/* Backdrop del drawer */}
      <div
        onClick={() => setIsDrawerOpen(false)}
        aria-hidden={!isDrawerOpen}
        className={cn(
          "fixed inset-0 z-50 bg-foreground/40 transition-opacity duration-300 motion-reduce:transition-none lg:hidden",
          isDrawerOpen ? "opacity-100" : "pointer-events-none opacity-0",
        )}
      />

      {/* Drawer mobile */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Menú de navegación"
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-72 max-w-[80%] flex-col gap-4 bg-card p-4 transition-transform duration-300 motion-reduce:transition-none lg:hidden",
          isDrawerOpen ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="flex items-center justify-between">
          <BrandLockup />
          <button
            type="button"
            onClick={() => setIsDrawerOpen(false)}
            aria-label="Cerrar menú de navegación"
            className="rounded-lg p-2 text-foreground transition-colors hover:bg-muted"
          >
            <X className="size-5" />
          </button>
        </div>
        <Sidebar orgId={orgId} items={items} onNavigate={() => setIsDrawerOpen(false)} />
        <div className="mt-auto">
          <UserMenu user={currentUser} />
        </div>
      </div>

      {/* Contenido */}
      <main className="flex-1 overflow-y-auto p-4 lg:p-6">{children}</main>
    </div>
  );
}
