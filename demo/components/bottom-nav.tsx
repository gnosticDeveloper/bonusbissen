"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Gift, User2, RotateCcwClock, ListPlus } from "lucide-react";
import { openMenu } from "@/lib/preferences/ui-store";

const HOME_ITEMS = [
  { href: "/b", label: "Inicio", icon: Home },
  { href: "/b/resumen", label: "Mis canjes", icon: Gift },
  { href: "/b/perfil", label: "Perfil", icon: User2 },
] as const;

export function BottomNav() {
  const pathname = usePathname();
  const isActive = (href: string) => (href === "/b" ? pathname === "/b" : pathname.startsWith(href));

  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-card/95 backdrop-blur-sm" data-tour="bottom-nav">
      <div className="mx-auto flex max-w-107.5 items-center justify-between px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2">
        {HOME_ITEMS.map(({ href, label, icon: Icon }) => {
          const active = isActive(href);

          return (
            <Link
              key={href}
              href={href}
              className={`flex w-17 flex-col items-center gap-1 whitespace-nowrap px-2 py-1 text-[12px] transition-colors ${active ? "text-primary" : "text-foreground"}`}
            >
              <span
                className={`grid place-items-center rounded-full before:content-[''] relative before:rounded-full before:blur-sm before:absolute before:inset-0 before:bg-primary  ${active ? "before:opacity-30" : "before:opacity-0"}`}
              >
                <Icon size={24} />
              </span>
              <span>{label}</span>
            </Link>
          );
        })}

        <button
          type="button"
          onClick={openMenu}
          aria-label="Abrir más opciones"
          className="flex w-17 flex-col items-center gap-1 whitespace-nowrap px-2 py-1 text-[12px] text-foreground transition-colors hover:text-foreground"
        >
          <ListPlus size={24} aria-hidden="true" />
          <span>Más</span>
        </button>
      </div>
    </nav>
  );
}

const MEMBER_ONLY_ITEMS = [
  { path: "/inicio", label: "Inicio", icon: Home },
  { path: "/recompensas", label: "Recompensas", icon: Gift },
  { path: "/historial", label: "Historial", icon: RotateCcwClock },
] as const;

export function MemberOnlyBottomNav({ slug, color }: { slug: string; color?: string }) {
  const pathname = usePathname();
  const isActive = (path: string) => pathname === `/s${path}`;

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-card/95 backdrop-blur-sm"
      data-tour="member-nav"
      style={
        {
          "--nav-active-color": color || "var(--primary)",
          "--nav-active-soft": color ? `${color}33` : "color-mix(in srgb, var(--primary) 20%, transparent)",
        } as React.CSSProperties
      }
    >
      <div className="mx-auto flex max-w-107.5 items-center justify-around px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2">
        {MEMBER_ONLY_ITEMS.map(({ path, label, icon: Icon }) => {
          const active = isActive(path);

          return (
            <Link
              key={path}
              href={`/s${path}?local=${encodeURIComponent(slug)}`}
              className={`flex w-17 flex-col items-center gap-1 whitespace-nowrap px-2 py-1 text-[12px] transition-colors ${active ? "text-(--nav-active-color)" : "text-foreground"}`}
            >
              <span
                className="grid place-items-center rounded-full transition-shadow"
                style={active ? { boxShadow: "0 4px 14px var(--nav-active-soft)" } : undefined}
              >
                <Icon size={22} />
              </span>
              <span>{label}</span>
            </Link>
          );
        })}

        <button
          type="button"
          onClick={openMenu}
          aria-label="Abrir más opciones"
          className="flex w-17 flex-col items-center gap-1 whitespace-nowrap px-2 py-1 text-[12px] text-foreground transition-colors hover:text-(--nav-active-color)"
        >
          <ListPlus size={22} aria-hidden="true" />
          <span>Más</span>
        </button>
      </div>
    </nav>
  );
}
