import type { LucideIcon } from "lucide-react";
import type { UserRole } from "@/lib/types/user";

export interface NavItem {
  id: string;
  label: string;
  icon: LucideIcon;
  roles: UserRole[];
  url: string;
  available: boolean;
  show: boolean;
}

/** Agrupación de la navegación del panel: rutas del local seleccionado vs. rutas de la organización. */
export interface NavSection {
  id: string;
  label: string;
  items: NavItem[];
}
