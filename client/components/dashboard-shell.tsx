"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Building2, ChevronDown, ChevronLeft, Menu, X } from "lucide-react";
import { selectStorefront } from "@/app/d/sign-in/actions";
import type { StorefrontSummary } from "@/lib/types/point-program";
import type { AdminUserInfo, UserRole } from "@/lib/types/user";
import { cn } from "@/lib/helpers/utils";
import { CARD_PALETTES, pickCardVariant } from "@/lib/helpers/color";
import { persistSidebarCollapsed } from "@/lib/preferences/sidebar";
import Sidebar, { getNavSections } from "./sidebar";
import { UserMenu } from "./user-menu";
import { BrandLockup, BrandMark } from "./brand";
import { ThemeToggleButton } from "./theme-toggle";

/** Anchos del `aside` de escritorio. El riel contraído deja 2.5rem útiles (la caja del icono). */
const SIDEBAR_WIDTH = 256;
const SIDEBAR_COLLAPSED_WIDTH = 72;

type DashboardShellProps = {
  orgId: string;
  role: UserRole;
  currentUser: AdminUserInfo | null;
  storefronts: StorefrontSummary[];
  activeStorefrontId?: string;
  activeColor?: string | null;
  /** Preferencia leída de la cookie en el servidor: evita el parpadeo al recargar. */
  defaultCollapsed?: boolean;
  children: React.ReactNode;
};

type StorefrontSwitcherProps = Pick<DashboardShellProps, "storefronts" | "activeStorefrontId"> & {
  collapsed?: boolean;
  onExpand?: VoidFunction;
};

function StorefrontSwitcher({ storefronts, activeStorefrontId, collapsed = false, onExpand }: StorefrontSwitcherProps) {
  const router = useRouter();
  const [switching, setSwitching] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [error, setError] = useState("");
  const switcherRef = useRef<HTMLDivElement>(null);
  const active = storefronts.find((storefront) => storefront.id === activeStorefrontId);

  useEffect(() => {
    if (!isOpen) return;

    const closeOnOutsideClick = (event: MouseEvent) => {
      if (!switcherRef.current?.contains(event.target as Node)) setIsOpen(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIsOpen(false);
    };

    document.addEventListener("mousedown", closeOnOutsideClick);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("mousedown", closeOnOutsideClick);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [isOpen]);

  async function handleSwitch(storefrontId: string) {
    if (storefrontId === activeStorefrontId) return;
    setSwitching(true);
    setError("");
    try {
      const result = await selectStorefront(storefrontId);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setIsOpen(false);
      router.push(`/d/${storefrontId}/inicio`);
    } catch {
      setError("No pudimos cambiar de local. Intentá de nuevo.");
    } finally {
      setSwitching(false);
    }
  }

  if (collapsed) {
    return (
      <button
        type="button"
        onClick={onExpand}
        title={active?.name ?? "Local no disponible"}
        aria-label={`Local actual: ${active?.name ?? "no disponible"}. Expandir menú`}
        className="flex size-10 shrink-0 items-center justify-center self-start rounded-xl border border-border bg-background text-foreground transition-colors hover:bg-foreground/10 motion-reduce:transition-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
      >
        <Building2 className="size-4" aria-hidden="true" />
      </button>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-background p-3">
      <div className="flex items-center gap-2 text-xs font-medium text-foreground/80">
        <Building2 className="size-4 shrink-0" />
        Local actual
      </div>
      <p className="mt-1 truncate text-sm font-semibold text-foreground" title={active?.name}>
        {active?.name ?? "Local no disponible"}
      </p>
      {storefronts.length > 1 && (
        <div ref={switcherRef} className="relative mt-3">
          <button
            type="button"
            aria-label="Cambiar de local"
            aria-haspopup="listbox"
            aria-expanded={isOpen}
            disabled={switching}
            onClick={() => setIsOpen((open) => !open)}
            className="flex w-full items-center justify-between gap-2 rounded-xl border border-border bg-card px-3 py-2.5 text-left text-sm text-foreground shadow-sm transition-[border-color,box-shadow,background-color] duration-200 hover:bg-foreground/10 focus-visible:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/70 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <span className="truncate">{active?.name ?? "Seleccioná un local"}</span>
            <ChevronDown className={cn("size-4 shrink-0 text-foreground transition-transform duration-200 motion-reduce:transition-none", isOpen && "rotate-180")} />
          </button>
          <div
            role="listbox"
            aria-label="Locales disponibles"
            className={cn(
              "absolute inset-x-0 top-[calc(100%+0.5rem)] z-20 origin-top rounded-xl border border-border bg-card p-1.5 shadow-lg transition-[opacity,transform] duration-200 ease-out motion-reduce:transition-none",
              isOpen ? "visible scale-100 opacity-100" : "invisible pointer-events-none scale-95 opacity-0",
            )}
          >
            {storefronts.map((storefront) => (
              <button
                key={storefront.id}
                type="button"
                role="option"
                aria-selected={storefront.id === activeStorefrontId}
                onClick={() => void handleSwitch(storefront.id)}
                className={cn(
                  "w-full truncate rounded-lg px-3 py-2 text-left text-sm transition-colors duration-150 hover:bg-foreground/10 focus-visible:bg-foreground/10 focus-visible:outline-none",
                  storefront.id === activeStorefrontId ? "bg-foreground/10 font-semibold text-foreground" : "text-foreground",
                )}
              >
                {storefront.name}
              </button>
            ))}
          </div>
        </div>
      )}
      {error && <p role="alert" className="mt-2 text-xs text-foreground">{error}</p>}
    </div>
  );
}

export function DashboardShell({
  orgId,
  role,
  children,
  currentUser,
  storefronts,
  activeStorefrontId,
  activeColor,
  defaultCollapsed = false,
}: DashboardShellProps) {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  // El valor inicial viene del servidor, así que el primer render del cliente ya
  // coincide con el HTML: no hay mismatch de hidratación ni animación de arranque.
  const [collapsed, setCollapsed] = useState(defaultCollapsed);
  const reduceMotion = useReducedMotion();
  const color = activeColor && /^#[\da-f]{6}(?:[\da-f]{2})?$/i.test(activeColor) ? activeColor.slice(0, 7) : null;
  const primaryStyle = color
    ? ({ "--primary": color, "--primary-foreground": CARD_PALETTES[pickCardVariant(color)].text } as React.CSSProperties)
    : undefined;

  const sections = getNavSections(role);

  const toggleCollapsed = useCallback(() => {
    const next = !collapsed;
    setCollapsed(next);
    persistSidebarCollapsed(next);
  }, [collapsed]);

  const widthTransition = reduceMotion ? { duration: 0 } : ({ type: "spring", stiffness: 400, damping: 40, mass: 0.8 } as const);
  const fade = reduceMotion ? { duration: 0 } : { duration: 0.15, ease: [0.4, 0, 0.2, 1] as const };

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
    <div className="flex h-svh flex-col lg:flex-row" style={primaryStyle}>
      {/* Sidebar fija en desktop (colapsable; en mobile se usa el drawer) */}
      <motion.aside
        initial={false}
        animate={{ width: collapsed ? SIDEBAR_COLLAPSED_WIDTH : SIDEBAR_WIDTH }}
        transition={widthTransition}
        // El ancho también va por clase: si el render del servidor no emite el style
        // inline de motion, el HTML inicial igual sale con el ancho correcto.
        className={cn("relative hidden shrink-0 border-r border-border bg-card lg:block", collapsed ? "lg:w-18" : "lg:w-64")}
      >
        <div className="flex h-full flex-col gap-5 p-4">
          <div className="flex h-10 items-center overflow-hidden">
            {/* El logo no se mueve al contraer: solo se desvanece el texto de la marca. */}
            <BrandMark className="shrink-0" />
            <motion.div
              initial={false}
              animate={{ opacity: collapsed ? 0 : 1, x: collapsed ? -4 : 0 }}
              transition={fade}
              aria-hidden={collapsed}
              className="ml-2.5 whitespace-nowrap text-base font-bold tracking-tight text-foreground"
            >
              Bonus Bissen
            </motion.div>
          </div>

          <AnimatePresence initial={false} mode="wait">
            <motion.div
              key={collapsed ? "switcher-rail" : "switcher-full"}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={fade}
            >
              <StorefrontSwitcher
                storefronts={storefronts}
                activeStorefrontId={activeStorefrontId}
                collapsed={collapsed}
                onExpand={toggleCollapsed}
              />
            </motion.div>
          </AnimatePresence>

          <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden">
            <Sidebar orgId={orgId} sections={sections} onNavigate={() => {}} collapsed={collapsed} />
          </div>

          <div className={cn("mt-auto flex gap-2", collapsed ? "flex-col items-center" : "flex-row-reverse items-center")}>
            <ThemeToggleButton className={cn(collapsed && "[&>button]:size-10")} />
            <AnimatePresence initial={false} mode="wait">
              <motion.div
                key={collapsed ? "user-rail" : "user-full"}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={fade}
                className={cn(!collapsed && "min-w-0 flex-1")}
              >
                <UserMenu slug={orgId} user={currentUser} collapsed={collapsed} />
              </motion.div>
            </AnimatePresence>
          </div>
        </div>

        <button
          type="button"
          onClick={toggleCollapsed}
          aria-expanded={!collapsed}
          aria-label={collapsed ? "Expandir barra lateral" : "Contraer barra lateral"}
          title={collapsed ? "Expandir barra lateral" : "Contraer barra lateral"}
          className="absolute -right-3 top-7 z-20 flex size-6 items-center justify-center rounded-full border border-border bg-card text-foreground/70 shadow-sm transition-colors hover:bg-foreground/10 hover:text-foreground motion-reduce:transition-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        >
          <motion.span
            initial={false}
            animate={{ rotate: collapsed ? 180 : 0 }}
            transition={reduceMotion ? { duration: 0 } : { duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
            className="flex"
          >
            <ChevronLeft className="size-3.5" aria-hidden="true" />
          </motion.span>
        </button>
      </motion.aside>

      {/* Header mobile */}
      <header className="flex items-center justify-between border-b border-border bg-card px-4 py-3 lg:hidden">
        <BrandLockup />
        <button
          type="button"
          onClick={() => setIsDrawerOpen(true)}
          aria-label="Abrir menú de navegación"
          aria-expanded={isDrawerOpen}
          className="rounded-lg p-2 text-foreground transition-colors hover:bg-foreground/10"
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
            className="rounded-lg p-2 text-foreground transition-colors hover:bg-foreground/10"
          >
            <X className="size-5" />
          </button>
        </div>
        <StorefrontSwitcher storefronts={storefronts} activeStorefrontId={activeStorefrontId} />
        <div className="min-h-0 flex-1 overflow-y-auto">
          <Sidebar orgId={orgId} sections={sections} onNavigate={() => setIsDrawerOpen(false)} />
        </div>
        <div className="mt-auto">
          <UserMenu slug={orgId} user={currentUser} />
        </div>
      </div>

      {/* Contenido */}
      <main className="flex-1 overflow-y-auto p-4 lg:p-6">{children}</main>
    </div>
  );
}
