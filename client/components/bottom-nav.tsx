"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Compass, Gift, Settings, QrCode } from "lucide-react";

const LEFT_ITEMS = [
  { href: "/b", label: "Inicio", icon: Home },
  { href: "/b/resumen", label: "Mis canjes", icon: Gift },
] as const;

const RIGHT_ITEMS = [
  { href: "/b/descubrir", label: "Descubrir", icon: Compass },
  { href: "/b/configuracion", label: "Config", icon: Settings },
] as const;

export function BottomNav() {
  const pathname = usePathname();
  const isActive = (href: string) => (href === "/b" ? pathname === "/b" : pathname.startsWith(href));

  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-card/95 backdrop-blur-sm">
      <div className="mx-auto flex max-w-107.5 items-center justify-between px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2">
        {LEFT_ITEMS.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className={`flex flex-col w-17 whitespace-nowrap items-center gap-1 px-2 py-1 text-[12px] transition-colors ${isActive(href) ? "text-primary" : "text-foreground"}`}
          >
            <Icon size={24} />
            <span>{label}</span>
          </Link>
        ))}

        {/* TODO: Implementar escaneo real de QR. */}
        <button
          aria-label="Escanear QR"
          className="-mt-6 flex h-16 w-16 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/30 transition-transform active:scale-95"
        >
          <QrCode size={34} />
        </button>

        {RIGHT_ITEMS.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className={`flex flex-col w-17 whitespace-nowrap items-center gap-1 px-2 py-1 text-[12px] transition-colors ${isActive(href) ? "text-primary" : "text-foreground"}`}
          >
            <Icon size={24} />
            <span>{label}</span>
          </Link>
        ))}
      </div>
    </nav>
  );
}
