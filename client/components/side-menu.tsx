"use client";

import { useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Moon, Sun, LogOut, X, ChevronRight, UserRound } from "lucide-react";
import { signOut } from "@/app/b/actions";
import { useUserStore } from "@/lib/user-store";
import { useUIStore } from "@/lib/ui-store";
import { BrandLockup } from "@/components/brand";

export function SideMenu() {
  const pathname = usePathname();
  const menuOpen = useUIStore((state) => state.menuOpen);
  const closeMenu = useUIStore((state) => state.closeMenu);
  const theme = useUIStore((state) => state.theme);
  const toggleTheme = useUIStore((state) => state.toggleTheme);

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
      >
        <div className="flex items-center justify-between px-5 pt-5">
          <BrandLockup />
          <button
            aria-label="Cerrar menú"
            onClick={closeMenu}
            className="flex h-9 w-9 items-center justify-center rounded-full text-muted transition-colors hover:bg-background hover:text-foreground"
          >
            <X size={18} />
          </button>
        </div>

        <Link
          href="/b/perfil"
          onClick={closeMenu}
          className="mx-4 mt-6 flex items-center gap-3 rounded-2xl bg-background p-4 transition-colors hover:bg-border/40"
        >
          <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary text-primary-foreground">
            <UserRound size={20} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate font-medium text-foreground">{user?.name ?? "Tu cuenta"}</p>
            <p className="text-sm text-muted">Ver mi perfil</p>
          </div>
          <ChevronRight size={16} className="shrink-0 text-muted" />
        </Link>

        <div className="mx-4 mt-4 flex items-center justify-between rounded-2xl bg-background p-4">
          <div className="flex items-center gap-3">
            {theme === "dark" ? <Moon size={18} className="text-foreground" /> : <Sun size={18} className="text-foreground" />}
            <span className="text-sm font-medium text-foreground">Modo oscuro</span>
          </div>
          <button
            role="switch"
            aria-checked={theme === "dark"}
            aria-label="Cambiar tema"
            onClick={toggleTheme}
            className={`relative h-6 w-11 shrink-0 rounded-full transition-colors motion-reduce:transition-none ${
              theme === "dark" ? "bg-primary" : "bg-muted/40"
            }`}
          >
            <span
              className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform motion-reduce:transition-none ${
                theme === "dark" ? "-translate-x-5" : "translate-x-0.5"
              }`}
            />
          </button>
        </div>

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
