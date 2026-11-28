"use client";

import Link from "next/link";
import { useId } from "react";
import { usePathname } from "next/navigation";
import { motion, useReducedMotion } from "motion/react";
import { cn } from "@/lib/helpers/utils";
import { NavItem, NavSection } from "@/lib/navigation";
import { UserRole } from "@/lib/types/user";
import { Award, Building2, ChartColumn, Coins, Home, Images, LifeBuoy, QrCode, ReceiptText, Settings, ShieldAlert, UserRound, UserRoundGroup, UsersRound } from "lucide-react";

/** Rutas resueltas contra el local seleccionado (claim `sf` del token verificado). */
const STOREFRONT_NAV: NavItem[] = [
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
  { id: "customers", label: "Clientes", icon: UsersRound, roles: [UserRole.ADMIN], url: "/clientes", available: true, show: true } as const,
  { id: "join-qr", label: "QR de afiliación", icon: QrCode, roles: [UserRole.ADMIN], url: "/codigo-qr", available: true, show: true } as const,
];

/** Rutas de organización (grupo `(admin-only)`): configuración y administración global. */
const ORGANIZATION_NAV: NavItem[] = [
  { id: "organization", label: "Mi negocio", icon: Building2, roles: [UserRole.ADMIN], url: "/mi-negocio", available: true, show: true } as const,
  { id: "billing", label: "Facturación", icon: ReceiptText, roles: [UserRole.ADMIN], url: "/facturacion", available: true, show: true } as const,
  { id: "employees", label: "Empleados", icon: UserRoundGroup, roles: [UserRole.ADMIN], url: "/empleados", available: true, show: true } as const,
  { id: "gallery", label: "Galeria", icon: Images, roles: [UserRole.ADMIN], url: "#", available: false, show: false } as const,
  { id: "audit", label: "Auditoría", icon: ShieldAlert, roles: [UserRole.ADMIN], url: "/auditoria", available: true, show: true } as const,
  { id: "analytics", label: "Reportes", icon: ChartColumn, roles: [UserRole.ADMIN], url: "#", available: false, show: false } as const,
];

/** Rutas personales de quien usa el panel: guías de ayuda, perfil y preferencias. */
const ACCOUNT_NAV: NavItem[] = [
  { id: "help", label: "Ayuda", icon: LifeBuoy, roles: [UserRole.ADMIN, UserRole.CASHIER], url: "/ayuda", available: true, show: true } as const,
  { id: "profile", label: "Mi perfil", icon: UserRound, roles: [UserRole.ADMIN, UserRole.CASHIER], url: "/perfil", available: true, show: true } as const,
  {
    id: "settings",
    label: "Configuración",
    icon: Settings,
    roles: [UserRole.ADMIN, UserRole.CASHIER],
    url: "/configuracion",
    available: true,
    show: true,
  } as const,
];

const NAV_SECTIONS: NavSection[] = [
  { id: "storefront", label: "Local", items: STOREFRONT_NAV },
  { id: "org", label: "Organización", items: ORGANIZATION_NAV },
  { id: "account", label: "Cuenta", items: ACCOUNT_NAV },
];

/**
 * Filtra la navegación por rol y descarta secciones vacías.
 * La visibilidad del menú no es control de acceso: el backend sigue siendo la autoridad.
 */
export function getNavSections(role: UserRole): NavSection[] {
  return NAV_SECTIONS.map((section) => ({
    ...section,
    items: section.items.filter((item) => item.show && item.roles.includes(role)),
  })).filter((section) => section.items.length > 0);
}

type SidebarProps = {
  sections: NavSection[];
  onNavigate: VoidFunction;
  orgId: string;
  /** Solo escritorio: contrae las etiquetas dejando la barra como riel de iconos. */
  collapsed?: boolean;
  /** Contador por `NavItem.id` (p. ej. canjes pendientes); se omite cuando es 0. */
  badges?: Partial<Record<string, number>>;
};

/** "99+" a partir de 100, para que el contador entre en el riel contraído. */
function badgeText(count: number): string {
  return count > 99 ? "99+" : String(count);
}

export default function Sidebar({ sections, onNavigate, orgId, collapsed = false, badges }: SidebarProps) {
  const pathname = usePathname();
  const reduceMotion = useReducedMotion();
  const headingId = useId();
  const fade = reduceMotion ? { duration: 0 } : { duration: 0.18, ease: [0.4, 0, 0.2, 1] as const };

  return (
    <nav aria-label="Navegación del panel" className="flex flex-col gap-3">
      {sections.map((section) => (
        <div key={section.id} className="flex flex-col gap-1" data-guide={`nav-section-${section.id}`}>
          {/* Altura fija: el rótulo y el separador se cruzan sin mover los enlaces. */}
          <div className="relative h-7 shrink-0 overflow-hidden">
            <motion.p
              id={`${headingId}-${section.id}`}
              initial={false}
              animate={{ opacity: collapsed ? 0 : 1 }}
              transition={fade}
              className="absolute inset-x-3 bottom-0.5 whitespace-nowrap text-[11px] font-semibold uppercase tracking-wider text-foreground/50"
            >
              {section.label}
            </motion.p>
            <motion.span
              aria-hidden="true"
              initial={false}
              animate={{ opacity: collapsed ? 1 : 0 }}
              transition={fade}
              className="absolute inset-x-2.5 bottom-3 block h-px bg-border"
            />
          </div>

          <ul aria-labelledby={`${headingId}-${section.id}`} className="flex flex-col gap-1">
            {section.items.map((item) => {
              const Icon = item.icon;
              const href = `/d/${orgId}${item.url}`;
              const isActive = pathname === href;
              const badge = badges?.[item.id] ?? 0;
              const badgeLabel = badge > 0 ? `${badge} ${badge === 1 ? "pendiente" : "pendientes"}` : null;
              return (
                <li key={item.id}>
                  <Link
                    href={href}
                    onClick={onNavigate}
                    title={collapsed ? (badgeLabel ? `${item.label} (${badgeLabel})` : item.label) : undefined}
                    className={cn(
                      "flex h-10 w-full items-center overflow-hidden rounded-lg text-sm font-medium transition-colors motion-reduce:transition-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary",
                      isActive ? "bg-primary text-primary-foreground" : "text-foreground/80 hover:bg-foreground/10 hover:text-foreground",
                      !item.available && "cursor-not-allowed opacity-50",
                    )}
                    aria-current={isActive ? "page" : undefined}
                  >
                    {/* Caja fija del icono: queda centrada en el riel contraído y alineada al expandir. */}
                    <span className="relative flex size-10 shrink-0 items-center justify-center">
                      <Icon className="size-4" aria-hidden="true" />
                      {/* Contraído, el contador pasa a la esquina del icono. */}
                      {badge > 0 && collapsed && (
                        <span
                          aria-hidden="true"
                          data-guide={`nav-badge-${item.id}`}
                          className="absolute right-0.5 top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-amber-500 px-1 text-[10px] leading-none text-amber-950 font-bold"
                        >
                          {badgeText(badge)}
                        </span>
                      )}
                    </span>
                    <motion.span
                      initial={false}
                      animate={{ opacity: collapsed ? 0 : 1, x: collapsed ? -4 : 0 }}
                      transition={fade}
                      // Expanded, a long label gives way (with an ellipsis) so the badge after it is never pushed out.
                      className={cn("whitespace-nowrap pr-3", !collapsed && "min-w-0 truncate")}
                    >
                      {item.label}
                    </motion.span>
                    {badgeLabel && <span className="sr-only">, {badgeLabel}</span>}
                    {badge > 0 && !collapsed && (
                      <span
                        aria-hidden="true"
                        data-guide={`nav-badge-${item.id}`}
                        className="ml-auto mr-2 flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-amber-500 px-1.5 text-[11px] font-bold leading-none text-amber-950"
                      >
                        {badgeText(badge)}
                      </span>
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}
