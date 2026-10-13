"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Building2, ChevronDown, Menu, X } from "lucide-react";
import { selectStorefront, type StorefrontSummary } from "@/app/d/sign-in/actions";
import type { AdminUserInfo, UserRole } from "@/lib/definitions";
import { cn } from "@/lib/helpers/utils";
import Sidebar, { NAV } from "./sidebar";
import { UserMenu } from "./user-menu";
import { BrandLockup } from "./brand";
import { ThemeToggleButton } from "./theme-toggle";

type DashboardShellProps = {
  orgId: string;
  role: UserRole;
  currentUser: AdminUserInfo | null;
  storefronts: StorefrontSummary[];
  activeStorefrontId?: string;
  children: React.ReactNode;
};

function StorefrontSwitcher({ storefronts, activeStorefrontId }: Pick<DashboardShellProps, "storefronts" | "activeStorefrontId">) {
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
      if (!result.success) {
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

export function DashboardShell({ orgId, role, children, currentUser, storefronts, activeStorefrontId }: DashboardShellProps) {
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
        <div className="flex items-center justify-between">
          <BrandLockup />
          <ThemeToggleButton />
        </div>
        <StorefrontSwitcher storefronts={storefronts} activeStorefrontId={activeStorefrontId} />
        <Sidebar orgId={orgId} items={items} onNavigate={() => {}} />
        <div className="mt-auto">
          <UserMenu slug={orgId} user={currentUser} />
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
        <Sidebar orgId={orgId} items={items} onNavigate={() => setIsDrawerOpen(false)} />
        <div className="mt-auto">
          <UserMenu slug={orgId} user={currentUser} />
        </div>
      </div>

      {/* Contenido */}
      <main className="flex-1 overflow-y-auto p-4 lg:p-6">{children}</main>
    </div>
  );
}
