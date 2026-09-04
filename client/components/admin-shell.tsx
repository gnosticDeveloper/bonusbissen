"use client";

import AppSectionTitle from "@/components/app-section-title";
import { MobileDrawer } from "@/components/mobile-drawer";
import Sidebar from "@/components/sidebar";
import { Button } from "@/components/ui/button";
import { MobileDrawerProvider, useMobileDrawer } from "@/providers/mobile-drawer-provider";
import { Coins, LogOut, Menu } from "lucide-react";
import { UserBadge } from "./user-badge";
import { getProfileInfo } from "@/app/[orgId]/(employee)/dashboard/actions";

type AdminShellProps = {
  children: React.ReactNode;
  orgId: string;
};

// Componente interno: es HIJO de MobileDrawerProvider (ver AdminShell más abajo),
// por eso useMobileDrawer() acá sí lee el estado real. Si este hook se llamara
// en el mismo componente que crea el Provider, volveríamos al bug original.
function AdminShellContent({ children, orgId }: AdminShellProps) {
  const { open } = useMobileDrawer();

  async function handleLogout() {
    // TODO: reemplazar por la acción real de logout cuando exista el endpoint
    // en el back (probablemente un Route Handler que limpie la cookie
    // `employee_token` vía el BFF y redirija a /login).
  }

  // const userPromise = getProfileInfo();

  return (
    <div className="flex min-h-svh flex-col bg-muted/30 lg:flex-row">
      {/* Sidebar (desktop) */}
      <aside className="hidden w-64 shrink-0 flex-col border-r border-border bg-card lg:flex">
        <div className="flex h-16 items-center gap-2 border-b border-border px-5">
          <div className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Coins className="size-4" />
          </div>
          <span className="font-serif text-lg font-semibold text-foreground">Panel</span>
        </div>
        <div className="flex-1 overflow-y-auto p-3">
          <Sidebar onNavigate={() => {}} orgId={orgId} />
        </div>
        <div className="border-t border-border p-3">
          {/*<UserBadge userPromise={userPromise} />*/}
          <Button variant="ghost" size="lg" className="w-full hover:text-red-500 cursor-pointer justify-start gap-2" onClick={handleLogout}>
            <LogOut className="size-4" /> Cerrar sesión
          </Button>
        </div>
      </aside>

      {/* Top bar (mobile) */}
      <header className="flex h-14 items-center justify-between border-b border-border bg-card px-4 lg:hidden">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={open} aria-label="Abrir menú">
            <Menu className="size-5" />
          </Button>
          <span className="font-serif text-base font-semibold text-foreground">Panel</span>
        </div>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="hover:text-red-500" onClick={handleLogout} aria-label="Cerrar sesión">
            <LogOut className="size-5" />
          </Button>
        </div>
      </header>

      <MobileDrawer orgId={orgId} />

      {/* Main */}
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="hidden h-16 items-center justify-between border-b border-border bg-card px-6 lg:flex">
          <AppSectionTitle />
        </div>
        <main className="flex-1 overflow-y-auto p-4 sm:p-6">{children}</main>
      </div>
    </div>
  );
}

export function AdminShell(props: AdminShellProps) {
  return (
    <MobileDrawerProvider>
      <AdminShellContent {...props} />
    </MobileDrawerProvider>
  );
}
