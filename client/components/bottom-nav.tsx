"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Gift, User2, History, ListPlus, type LucideIcon } from "lucide-react";
import { useUIStore } from "@/lib/preferences/ui-store";

// Shared by both navs so their items look the same. The accent is the `brand` token: the app
// primary everywhere, the storefront's color inside /s/[slug] (its layout sets --brand).
const itemClass = "flex w-17 flex-col items-center gap-1 whitespace-nowrap px-2 py-1 text-[12px] transition-colors";
const navClass = "fixed inset-x-0 bottom-0 z-30 border-t border-border bg-card/95 backdrop-blur-sm";
const rowClass = "mx-auto flex max-w-107.5 items-center justify-between px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2";

function NavItem({ href, label, icon: Icon, active }: { href: string; label: string; icon: LucideIcon; active: boolean }) {
  return (
    <Link href={href} aria-current={active ? "page" : undefined} className={`${itemClass} ${active ? "text-brand" : "text-foreground"}`}>
      <span
        className={`relative grid place-items-center rounded-full before:absolute before:inset-0 before:rounded-full before:bg-brand before:blur-sm before:content-[''] ${active ? "before:opacity-30" : "before:opacity-0"}`}
      >
        <Icon size={24} aria-hidden="true" />
      </span>
      <span>{label}</span>
    </Link>
  );
}

function MoreButton() {
  const openMenu = useUIStore((state) => state.openMenu);

  return (
    <button type="button" onClick={openMenu} aria-haspopup="dialog" aria-label="Abrir más opciones" className={`${itemClass} text-foreground`}>
      <ListPlus size={24} aria-hidden="true" />
      <span>Más</span>
    </button>
  );
}

const HOME_ITEMS = [
  { href: "/b", label: "Inicio", icon: Home },
  { href: "/b/resumen", label: "Mis canjes", icon: Gift },
  // { href: "/descubrir", label: "Descubrir", icon: Compass },
  { href: "/b/perfil", label: "Perfil", icon: User2 },
] as const;

export function BottomNav() {
  const pathname = usePathname();
  const isActive = (href: string) => (href === "/b" ? pathname === "/b" : pathname.startsWith(href));

  return (
    <nav aria-label="Navegación principal" className={navClass}>
      <div className={rowClass}>
        {HOME_ITEMS.map((item) => (
          <NavItem key={item.href} {...item} active={isActive(item.href)} />
        ))}
        <MoreButton />
      </div>
    </nav>
  );
}

const MEMBER_ONLY_ITEMS = [
  { path: "/inicio", label: "Inicio", icon: Home },
  { path: "/recompensas", label: "Recompensas", icon: Gift },
  { path: "/historial", label: "Historial", icon: History },
] as const;

export function MemberOnlyBottomNav({ slug }: { slug: string }) {
  const pathname = usePathname();

  return (
    <nav aria-label="Navegación de la tienda" className={navClass}>
      <div className={rowClass}>
        {MEMBER_ONLY_ITEMS.map(({ path, label, icon }) => {
          const href = `/s/${slug}${path}`;
          return <NavItem key={path} href={href} label={label} icon={icon} active={pathname === href} />;
        })}
        <MoreButton />
      </div>
    </nav>
  );
}
