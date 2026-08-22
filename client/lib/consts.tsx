import { NavItem } from "@/lib/definitions";
import { Award, Building2, Coins, Home, QrCode, Users } from "lucide-react";

export const NAV: NavItem[] = [
  { id: "home", label: "Inicio", icon: Home, roles: ["ADMIN", "CASHIER"], url: "/dashboard" } as const,
  { id: "points", label: "Administrar puntos", icon: Coins, roles: ["ADMIN", "CASHIER"], url: "/dashboard/points" } as const,
  { id: "redemptions", label: "Validación de canjes", icon: QrCode, roles: ["ADMIN", "CASHIER"], url: "/dashboard/redemptions" } as const,
  { id: "rewards", label: "Gestión de recompensas", icon: Award, roles: ["ADMIN", "CASHIER"], url: "/dashboard/rewards" } as const,
  { id: "customers", label: "Listado de clientes", icon: Users, roles: ["ADMIN", "CASHIER"], url: "/dashboard/customers" } as const,
  { id: "organization", label: "Tu negocio", icon: Building2, roles: ["ADMIN"], url: "/dashboard/your-org" } as const,
];

export const getPageNameByPathname = (str: string) => {
  return NAV.find((i) => str.endsWith(i.url)).label;
}
