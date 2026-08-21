"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Coins, QrCode, Award, Users, Building2 } from "lucide-react";
import { cn } from "@/lib/utils";

type SidebarProps = {
  hasPendings: boolean;
  onNavigate: VoidFunction;
  orgId: string;
};

export type AdminPage = "home" | "points" | "redemptions" | "rewards" | "customers" | "organization";
// TODO: remove hardcoded type here and create a specific type definitions file.
type Role = "ADMIN" | "CASHIER" | "CUSTOMER";

interface NavItem {
  id: AdminPage;
  label: string;
  icon: typeof Coins;
  roles: Role[];
  url: string;
}

const NAV: NavItem[] = [
  { id: "home", label: "Inicio", icon: Home, roles: ["ADMIN", "CASHIER"], url: "/dashboard" } as const,
  { id: "points", label: "Administrar puntos", icon: Coins, roles: ["ADMIN", "CASHIER"], url: "/dashboard/points" } as const,
  { id: "redemptions", label: "Validación de canjes", icon: QrCode, roles: ["ADMIN", "CASHIER"], url: "/dashboard/redemptions" } as const,
  { id: "rewards", label: "Gestión de recompensas", icon: Award, roles: ["ADMIN", "CASHIER"], url: "/dashboard/rewards" } as const,
  { id: "customers", label: "Listado de clientes", icon: Users, roles: ["ADMIN", "CASHIER"], url: "/dashboard/customers" } as const,
  { id: "organization", label: "Tu negocio", icon: Building2, roles: ["ADMIN"], url: "/dashboard/your-org" } as const,
];

export default function Sidebar({ hasPendings, onNavigate, orgId }: SidebarProps) {
  const pathname = usePathname();
  return (
    <nav className="flex flex-col gap-1">
      {NAV.map((item) => {
        const Icon = item.icon;
        const isActive = pathname === `/${orgId}${item.url}`;
        return (
          <Link
            href={`/${orgId}${item.url}`}
            key={item.id}
            onClick={onNavigate}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
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
