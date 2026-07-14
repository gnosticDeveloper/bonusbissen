"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Home, Repeat, Gift, LogOut, Settings, Sparkles } from "lucide-react";
import PingDot from "@/components/ping-dot";

type NavItem = {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  ping?: boolean;
};

export default function Sidebar({ hasPendings }: { hasPendings: boolean }) {
  const pathname = usePathname();
  const router = useRouter();

  const navItems: NavItem[] = [
    { label: "Inicio", href: "/", icon: Home },
    { label: "Administrar puntos", href: "/administrar-puntos", icon: Sparkles },
    { label: "Validación de canje", href: "/verificar-canjes", icon: Repeat, ping: hasPendings },
    { label: "Recompensas", href: "/recompensas", icon: Gift },
  ];

  return (
    <aside className="fixed left-0 top-0 h-screen w-72 flex flex-col justify-between border-r border-ink/10 bg-cream-dark/40 px-6 py-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-ink mb-12 px-2">Bonus Bissen</h1>

        <nav className="flex flex-col gap-2">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`group relative flex items-center gap-3 rounded-xl px-4 py-3 text-xl transition-colors ${
                  isActive ? "bg-amber text-cream font-semibold" : "text-ink-soft hover:bg-ink/5 hover:text-ink"
                }`}
              >
                <Icon className="h-6 w-6 shrink-0" />
                <span>{item.label}</span>
                {item.ping && <PingDot className="absolute right-4 top-1/2 -translate-y-1/2" />}
              </Link>
            );
          })}
        </nav>
      </div>

      <div className="flex flex-col gap-2 px-2">
        <button
          type="button"
          className="flex items-center gap-3 rounded-xl px-4 py-3 text-xl text-ink-soft hover:bg-ink/5 hover:text-ink transition-colors"
        >
          <Settings className="h-6 w-6" />
          <span>Configuración</span>
        </button>
        <button onClick={async () => {
          const response = await fetch("/api/employees/logout", {
            method: "POST",
          });
          if (!response.ok) throw new Error("No se pudo cerrar la sesión");
          router.push("/login");
        }} type="button" className="flex cursor-pointer items-center gap-3 rounded-xl px-4 py-3 text-xl text-rust hover:bg-rust/10 transition-colors">
          <LogOut className="h-6 w-6" />
          <span>Cerrar sesión</span>
        </button>
      </div>
    </aside>
  );
}
