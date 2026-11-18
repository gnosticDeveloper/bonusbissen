"use client";

import { useEffect, useId } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogOut, X, ChevronRight, Home, Compass, UserRound } from "lucide-react";
import { useAnimate, useReducedMotion } from "motion/react";
import { signOut } from "@/app/b/actions";
import { useUIStore } from "@/lib/preferences/ui-store";
import { BrandLockup } from "@/components/brand";
import { LogoTile } from "@/components/logo-tile";
import { formatNumber } from "@/lib/helpers/format";
import { ThemeToggle } from "./theme-toggle";
import { useUser } from "@/providers/user-provider";

/** The storefront the customer is browsing; only storefront pages pass it. */
export type SideMenuStorefront = {
  name: string;
  logoUrl: string | null;
  /** `null` when the balance couldn't be read. */
  points: number | null;
  pointLabel: string;
};

function initials(name: string | undefined): string {
  const words = (name ?? "").trim().split(/\s+/).filter(Boolean);
  return words
    .slice(0, 2)
    .map((word) => word.charAt(0).toUpperCase())
    .join("");
}

const navLinkClass =
  "flex min-h-13 items-center gap-3.5 rounded-xl px-3 text-base font-semibold text-foreground transition-colors hover:bg-foreground/5 focus-visible:outline-2 focus-visible:outline-foreground/70";

export function SideMenu({ backHref, storefront }: { backHref?: string; storefront?: SideMenuStorefront }) {
  const pathname = usePathname();
  const menuOpen = useUIStore((state) => state.menuOpen);
  const closeMenu = useUIStore((state) => state.closeMenu);
  const [scope, animate] = useAnimate<HTMLDialogElement>();
  const generalHeadingId = useId();
  const reduceMotion = useReducedMotion();

  const user = useUser();
  const userInitials = initials(user?.name);

  useEffect(() => {
    closeMenu();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  // The store is the source of truth; showModal() provides the top layer, inert background,
  // focus containment and focus return to the "Más" button. The dialog must be shown before the
  // entrance starts (a display:none dialog has nothing to animate), so Motion is driven from here
  // rather than declaratively. Closing waits for the exit before calling close().
  useEffect(() => {
    const dialog = scope.current;
    if (!dialog) return;

    // Fixed-length tweens rather than springs: the page stays inert until close() runs, so the exit
    // must end when it looks finished (a spring's settle tail kept the dialog modal past the slide).
    const enter = reduceMotion ? { duration: 0 } : ({ duration: 0.3, ease: [0.22, 1, 0.36, 1] } as const);
    const exit = reduceMotion ? { duration: 0 } : ({ duration: 0.22, ease: [0.4, 0, 1, 1] } as const);

    if (menuOpen) {
      // Fresh open: slide from off-screen. Reopened mid-exit: continue from where the panel is.
      const fresh = !dialog.open;
      if (fresh) dialog.showModal();
      animate("[data-side-menu-dim]", { opacity: fresh ? [0, 1] : 1 }, enter);
      animate("[data-side-menu-panel]", { x: fresh ? ["100%", "0%"] : "0%" }, enter);
    } else if (dialog.open) {
      animate("[data-side-menu-dim]", { opacity: 0 }, exit);
      animate("[data-side-menu-panel]", { x: "100%" }, exit).then(() => {
        // A reopen during the exit takes over the animation; only close if it's still meant to be closed.
        if (!useUIStore.getState().menuOpen && dialog.open) dialog.close();
      });
    }
  }, [menuOpen, reduceMotion, animate, scope]);

  useEffect(() => {
    if (!menuOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [menuOpen]);

  const handleSignOut = async () => {
    closeMenu();
    await signOut();
  };

  return (
    <dialog
      ref={scope}
      aria-label="Menú"
      // Escape: animate out like every other close instead of letting the dialog vanish.
      onCancel={(event) => {
        event.preventDefault();
        closeMenu();
      }}
      // The browser can still force-close it (e.g. a repeated Escape); keep the store in sync.
      onClose={closeMenu}
      // Full-screen and transparent: the dim is painted inside the dialog (see `.side-menu` in globals.css).
      className="side-menu m-0 h-dvh max-h-none w-full max-w-none overflow-hidden border-0 bg-transparent p-0 text-foreground"
    >
      <div data-side-menu-dim aria-hidden="true" className="absolute inset-0 bg-black/70" onClick={closeMenu} />

      <div
        data-side-menu-panel
        className="relative ms-auto flex h-full w-[85%] max-w-80 flex-col border-l border-border bg-card px-4 pt-4 pb-[max(1.25rem,env(safe-area-inset-bottom))] shadow-2xl"
      >
        <div className="flex h-12 items-center justify-between pl-1">
          <BrandLockup size="sm" />
          <button
            type="button"
            aria-label="Cerrar menú"
            onClick={closeMenu}
            className="grid size-11 place-items-center rounded-xl text-foreground/75 transition-colors hover:bg-foreground/5 hover:text-foreground focus-visible:outline-2 focus-visible:outline-foreground/70"
          >
            <X size={22} aria-hidden="true" />
          </button>
        </div>

        <div className="mt-4 flex min-h-0 flex-1 flex-col overflow-y-auto">
          <Link
            href="/b/perfil"
            onClick={closeMenu}
            className="flex items-center gap-3 rounded-2xl border border-border bg-background p-3 transition-colors hover:bg-foreground/5 focus-visible:outline-2 focus-visible:outline-foreground/70"
          >
            <span className="grid size-11.5 shrink-0 place-items-center overflow-hidden rounded-full bg-primary text-[17px] font-bold text-primary-foreground">
              {user?.avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={user.avatarUrl} alt="" className="size-full object-cover" />
              ) : (
                <span aria-hidden="true">{userInitials || <UserRound size={20} />}</span>
              )}
            </span>
            <span className="flex min-w-0 flex-1 flex-col gap-0.5">
              <span className="truncate text-base font-bold">{user?.name ?? "Tu cuenta"}</span>
              <span className="text-[13px] text-foreground/75">Ver mi perfil</span>
            </span>
            <ChevronRight size={18} className="shrink-0 text-foreground/60" aria-hidden="true" />
          </Link>

          {storefront && (
            <div className="mt-3 flex items-center gap-3 rounded-2xl border border-dashed border-border p-3">
              <LogoTile src={storefront.logoUrl} name={storefront.name} className="size-10 rounded-[11px]" />
              <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                <span className="text-xs text-foreground/75">Estás en</span>
                <span className="truncate text-[15px] font-bold">{storefront.name}</span>
              </span>
              {storefront.points !== null && (
                <span className="inline-flex h-7 shrink-0 items-center rounded-full bg-brand/20 px-2.5 text-[13px] font-bold tabular-nums text-brand-ink">
                  {formatNumber(storefront.points)}
                  <span className="sr-only"> {storefront.pointLabel}</span>
                </span>
              )}
            </div>
          )}

          <nav aria-labelledby={generalHeadingId} className="mt-6 flex flex-col gap-0.5">
            <span id={generalHeadingId} className="px-3 pb-2 text-xs font-bold uppercase tracking-[0.06em] text-foreground/75">
              General
            </span>
            {backHref && (
              <Link href={backHref} onClick={closeMenu} className={navLinkClass}>
                <Home size={22} className="text-foreground/80" aria-hidden="true" />
                Inicio de Bonus Bissen
              </Link>
            )}
            <Link href="/descubrir" onClick={closeMenu} className={navLinkClass}>
              <Compass size={22} className="text-foreground/80" aria-hidden="true" />
              Explorar negocios
            </Link>
          </nav>

          <div className="mt-5 border-t border-border pt-5">
            <ThemeToggle />
          </div>
        </div>

        <div className="mt-4 border-t border-border pt-4">
          <button
            type="button"
            onClick={handleSignOut}
            className="flex min-h-13 w-full items-center gap-3.5 rounded-xl px-3 text-left text-base font-semibold text-red-700 transition-colors hover:bg-red-500/10 focus-visible:outline-2 focus-visible:outline-foreground/70 dark:text-red-300"
          >
            <LogOut size={22} aria-hidden="true" />
            Cerrar sesión
          </button>
        </div>
      </div>
    </dialog>
  );
}
