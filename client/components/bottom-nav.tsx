"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Gift, User2, RotateCcwClock } from "lucide-react";

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
    <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-card/95 backdrop-blur-sm">
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
                className="grid place-items-center rounded-full transition-shadow"
                style={active ? { boxShadow: "0 4px 14px color-mix(in srgb, var(--primary) 33%, transparent)" } : undefined}
              >
                <Icon size={24} />
              </span>
              <span>{label}</span>
            </Link>
          );
        })}

        {/* Note: Afiliating to a pointProgram is performed with a basic confirmation flow through "/afiliarse". We are not planning to use QRs for now. */}
        {/*<button
          aria-label="Escanear QR"
          className="-mt-6 flex h-16 w-16 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/30 transition-transform active:scale-95"
        >
          <QrCode size={34} />
        </button>*/}
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
  const isActive = (path: string) => pathname === `/s/${slug}${path}`;

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-card/95 backdrop-blur-sm"
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
              href={`/s/${slug}${path}`}
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
      </div>
    </nav>
  );
}
