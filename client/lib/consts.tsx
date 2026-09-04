import { NavItem } from "@/lib/definitions";
import { Award, Building2, Coins, Home, QrCode, Users } from "lucide-react";
import { UserRole } from "./auth/session";

export const NAV: NavItem[] = [
  { id: "home", label: "Inicio", icon: Home, roles: [UserRole.ADMIN, UserRole.CASHIER], url: "/dashboard" } as const,
  { id: "points", label: "Administrar puntos", icon: Coins, roles: [UserRole.ADMIN, UserRole.CASHIER], url: "/dashboard/points" } as const,
  {
    id: "redemptions",
    label: "Validación de canjes",
    icon: QrCode,
    roles: [UserRole.ADMIN, UserRole.CASHIER],
    url: "/dashboard/redemptions",
  } as const,
  { id: "rewards", label: "Gestión de recompensas", icon: Award, roles: [UserRole.ADMIN, UserRole.CASHIER], url: "/dashboard/rewards" } as const,
  { id: "customers", label: "Listado de clientes", icon: Users, roles: [UserRole.ADMIN, UserRole.CASHIER], url: "/dashboard/customers" } as const,
  { id: "organization", label: "Tu negocio", icon: Building2, roles: [UserRole.ADMIN], url: "/dashboard/your-org" } as const,
];

export const getPageNameByPathname = (str: string) => {
  return NAV.find((i) => str.endsWith(i.url))!.label;
};
