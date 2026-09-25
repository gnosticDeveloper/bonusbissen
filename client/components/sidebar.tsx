"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/helpers/utils";
import { NavItem, UserRole } from "@/lib/definitions";
import { Award, Building2, Coins, Home, QrCode } from "lucide-react";

export const NAV: NavItem[] = [
  { id: "home", label: "Inicio", icon: Home, roles: [UserRole.ADMIN, UserRole.CASHIER], url: "/inicio" } as const,
  { id: "points", label: "Administrar puntos", icon: Coins, roles: [UserRole.ADMIN, UserRole.CASHIER], url: "/administrar-puntos" } as const,
  { id: "redemptions", label: "Validación de canjes", icon: QrCode, roles: [UserRole.ADMIN, UserRole.CASHIER], url: "/verificacion-canjes" } as const,
  { id: "rewards", label: "Gestión de recompensas", icon: Award, roles: [UserRole.ADMIN, UserRole.CASHIER], url: "/gestion-recompensas" } as const,
  { id: "organization", label: "Mi negocio", icon: Building2, roles: [UserRole.ADMIN], url: "/mi-negocio" } as const,
];

type SidebarProps = {
  items: NavItem[];
  onNavigate: VoidFunction;
  orgId: string;
};

export default function Sidebar({ items, onNavigate, orgId }: SidebarProps) {
  const pathname = usePathname();
  return (
    <nav className="flex flex-col gap-1">
      {items.map((item) => {
        const Icon = item.icon;
        const isActive = pathname === `/d/${orgId}${item.url}`;
        return (
          <Link
            href={`/d/${orgId}${item.url}`}
            key={item.id}
            onClick={onNavigate}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors motion-reduce:transition-none",
              isActive ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
            aria-current={isActive ? "page" : undefined}
          >
            <Icon className="size-4" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
