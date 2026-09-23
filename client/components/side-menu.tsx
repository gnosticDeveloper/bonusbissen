"use client";

import { useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogOut, X, ChevronRight, UserRound, ArrowLeft, Home } from "lucide-react";
import { signOut } from "@/app/b/actions";
import { useUserStore } from "@/lib/user-store";
import { useUIStore } from "@/lib/ui-store";
import { BrandLockup } from "@/components/brand";
import { ThemeToggle } from "./theme-toggle";

export function SideMenu({ backHref, backLabel, color }: { backHref?: string; backLabel?: string; color?: string }) {
  const pathname = usePathname();
  const menuOpen = useUIStore((state) => state.menuOpen);
  const closeMenu = useUIStore((state) => state.closeMenu);

  const user = useUserStore((state) => state.user);
  const resetUser = useUserStore((state) => state.reset);

  useEffect(() => {
    closeMenu();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  const handleSignOut = async () => {
    closeMenu();
    resetUser();
    await signOut();
  };

  return (
    <>
      <div
        aria-hidden={!menuOpen}
        onClick={closeMenu}
        className={`fixed inset-0 z-40 bg-black/50 backdrop-blur-[2px] transition-opacity motion-reduce:transition-none ${
          menuOpen ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
      />

      <aside
        role="dialog"
        aria-modal="true"
        aria-label="Menú"
        aria-hidden={!menuOpen}
        className={`fixed right-0 top-0 z-50 flex h-full w-[85%] max-w-[320px] flex-col bg-card shadow-2xl transition-transform duration-300 ease-out motion-reduce:transition-none ${
          menuOpen ? "translate-x-0" : "translate-x-full"
        }`}
        style={
          {
            "--side-menu-accent": color || "var(--primary)",
          } as React.CSSProperties
        }
      >
        <div className="flex items-center justify-between px-5 pt-5">
          <BrandLockup color={color} />
          <button
            aria-label="Cerrar menú"
            onClick={closeMenu}
            className="flex h-9 w-9 items-center justify-center rounded-full text-muted transition-colors hover:bg-background hover:text-foreground"
          >
            <X size={18} />
          </button>
        </div>

        {backHref && (
          <Link
            onClick={closeMenu}
            href="/b"
            className="mx-4 bg-background mt-6 transition-colors flex items-center gap-3 rounded-2xl hover:bg-(--side-menu-accent)/10 p-4 text-sm font-bold hover:text-(--side-menu-accent)"
          >
            <Home size={18} />
            Volver al inicio
          </Link>
        )}

        <Link
          href="/b/perfil"
          onClick={closeMenu}
          className="mx-4 mt-4 flex items-center gap-3 rounded-2xl bg-background p-4 transition-colors hover:bg-border/40"
        >
          <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full bg-(--side-menu-accent) text-primary-foreground">
            <UserRound size={20} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate font-medium text-foreground">{user?.name ?? "Tu cuenta"}</p>
            <p className="text-sm text-muted">Ver mi perfil</p>
          </div>
          <ChevronRight size={16} className="shrink-0 text-muted" />
        </Link>

        <ThemeToggle color={color} />

        <button
          onClick={handleSignOut}
          className="mx-4 mb-[max(1.25rem,env(safe-area-inset-bottom))] mt-auto flex items-center gap-2 rounded-2xl px-4 py-3 text-sm font-medium text-red-400 transition-colors hover:bg-red-400/10"
        >
          <LogOut size={16} />
          Cerrar sesión
        </button>
      </aside>
    </>
  );
}
