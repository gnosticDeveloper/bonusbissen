"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Home, Repeat, Gift, LogOut, Settings, Sparkles, Menu, X, PanelLeftClose, PanelLeftOpen } from "lucide-react";
import PingDot from "@/components/ping-dot";

type NavItem = {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  ping?: boolean;
};

type SidebarProps = {
  hasPendings: boolean;
  collapsed: boolean;
  onToggleCollapsedAction: () => void;
};

export default function Sidebar({ hasPendings, collapsed, onToggleCollapsedAction }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);

  const navItems: NavItem[] = [
    { label: "Inicio", href: "/", icon: Home },
    { label: "Administrar puntos", href: "/administrar-puntos", icon: Sparkles },
    { label: "Validación de canje", href: "/verificar-canjes", icon: Repeat, ping: hasPendings },
    { label: "Recompensas", href: "/recompensas", icon: Gift },
  ];

  const hideLabelClass = collapsed ? "lg:hidden" : "";

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        aria-label="Abrir menú"
        className="fixed left-4 top-4 z-30 rounded-xl bg-cream-dark/40 p-2.5 lg:hidden"
      >
        <Menu className="h-6 w-6 text-ink" />
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-40 bg-black/50 lg:hidden" onClick={() => setIsOpen(false)} />
      )}

      <aside
        className={`fixed left-0 top-0 z-50 h-screen w-72 max-w-[85vw] flex flex-col justify-between border-r border-ink/10 bg-cream-dark/40 px-6 py-8 transition-[transform,width] lg:translate-x-0 lg:z-auto ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        } ${collapsed ? "lg:w-20 lg:px-3" : "lg:w-72"}`}
      >
        <div>
          <div className={`mb-12 flex items-center px-2 ${collapsed ? "lg:justify-center" : "justify-between"}`}>
            <h1 className={`text-2xl font-bold tracking-tight text-ink ${hideLabelClass}`}>Bonus Bissen</h1>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              aria-label="Cerrar menú"
              className="rounded-full p-1 hover:bg-ink/5 transition-colors lg:hidden"
            >
              <X className="h-5 w-5 text-ink-soft" />
            </button>
            <button
              type="button"
              onClick={onToggleCollapsedAction}
              aria-label={collapsed ? "Expandir menú" : "Colapsar menú"}
              className="hidden lg:block rounded-full p-1.5 hover:bg-ink/5 transition-colors text-ink-soft"
            >
              {collapsed ? <PanelLeftOpen className="h-5 w-5" /> : <PanelLeftClose className="h-5 w-5" />}
            </button>
          </div>

          <nav className="flex flex-col gap-2">
            {navItems.map((item) => {
              const isActive = pathname === item.href;
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setIsOpen(false)}
                  aria-label={item.label}
                  className={`group relative flex items-center gap-3 rounded-xl px-4 py-3 text-xl transition-colors ${
                    collapsed ? "lg:justify-center lg:px-0" : ""
                  } ${isActive ? "bg-amber text-cream font-semibold" : "text-ink-soft hover:bg-ink/5 hover:text-ink"}`}
                >
                  <Icon className="h-6 w-6 shrink-0" />
                  <span className={hideLabelClass}>{item.label}</span>
                  {item.ping && <PingDot className="absolute right-4 top-1/2 -translate-y-1/2" />}
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="flex flex-col gap-2 px-2">
          <button
            type="button"
            disabled
            aria-label="Configuración (no disponible todavía)"
            title="No disponible todavía"
            className={`flex items-center gap-3 rounded-xl px-4 py-3 text-xl text-ink-soft/50 cursor-not-allowed ${
              collapsed ? "lg:justify-center lg:px-0" : ""
            }`}
          >
            <Settings className="h-6 w-6" />
            <span className={hideLabelClass}>Configuración</span>
          </button>

          <button
            onClick={async () => {
              const response = await fetch("/api/employees/logout", {
                method: "POST",
              });
              if (!response.ok) throw new Error("No se pudo cerrar la sesión");
              router.push("/login");
            }}
            type="button"
            aria-label="Cerrar sesión"
            className={`flex cursor-pointer items-center gap-3 rounded-xl px-4 py-3 text-xl text-rust hover:bg-rust/10 transition-colors ${
              collapsed ? "lg:justify-center lg:px-0" : ""
            }`}
          >
            <LogOut className="h-6 w-6" />
            <span className={hideLabelClass}>Cerrar sesión</span>
          </button>
        </div>
      </aside>
    </>
  );
}
