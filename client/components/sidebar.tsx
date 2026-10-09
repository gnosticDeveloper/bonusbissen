"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/helpers/utils";
import { NavItem, UserRole } from "@/lib/definitions";
import { Award, Building2, ChartColumn, Coins, Home, Images, QrCode, ShieldAlert, UserRoundGroup } from "lucide-react";

export const NAV: NavItem[] = [
  { id: "home", label: "Inicio", icon: Home, roles: [UserRole.ADMIN, UserRole.CASHIER], url: "/inicio", available: true, show: true } as const,
  {
    id: "points",
    label: "Administrar puntos",
    icon: Coins,
    roles: [UserRole.ADMIN, UserRole.CASHIER],
    url: "/administrar-puntos",
    available: true,
    show: true,
  } as const,
  {
    id: "redemptions",
    label: "Validación de canjes",
    icon: QrCode,
    roles: [UserRole.ADMIN, UserRole.CASHIER],
    url: "/verificacion-canjes",
    available: true,
    show: true,
  } as const,
  {
    id: "rewards",
    label: "Gestión de recompensas",
    icon: Award,
    roles: [UserRole.ADMIN, UserRole.CASHIER],
    url: "/gestion-recompensas",
    available: true,
    show: true,
  } as const,
  { id: "organization", label: "Mi negocio", icon: Building2, roles: [UserRole.ADMIN], url: "/mi-negocio", available: true, show: true } as const,
  { id: "employees", label: "Empleados", icon: UserRoundGroup, roles: [UserRole.ADMIN], url: "#", available: false, show: false } as const,
  { id: "gallery", label: "Galeria", icon: Images, roles: [UserRole.ADMIN], url: "#", available: false, show: false } as const,
  { id: "audit", label: "Auditoría", icon: ShieldAlert, roles: [UserRole.ADMIN], url: "#", available: false, show: false } as const,
  { id: "analytics", label: "Reportes", icon: ChartColumn, roles: [UserRole.ADMIN], url: "#", available: false, show: false } as const,
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
              isActive ? "bg-primary text-primary-foreground" : "text-foreground/80 hover:bg-foreground/10 hover:text-foreground",
              !item.available && "cursor-not-allowed opacity-50",
              !item.show && "hidden",
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
