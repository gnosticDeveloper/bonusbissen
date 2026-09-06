"use client";

import { useEffect, useState } from "react";
import { Bell, ChevronRight, Compass, Home, Menu, Moon, QrCode, Sun, UserRound, X } from "lucide-react";
import { useUserStore } from "@/lib/user-store";
import type { NearbyBusiness, PointsResponse } from "@/lib/definitions";
import { PointsCard } from "@/components/points-card";
import { BusinessList } from "@/components/business-list";
import { getNearbyBusinesses, getPoints } from "@/app/b/actions";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { BrandLockup } from "@/components/brand";

export default function MainHomePage() {
  const pathname = usePathname();

  const [points, setPoints] = useState<PointsResponse | null>(null);
  const [pointsError, setPointsError] = useState(false);
  const [businesses, setBusinesses] = useState<NearbyBusiness[]>([]);
  const [businessesLoading, setBusinessesLoading] = useState(true);
  const [businessesError, setBusinessesError] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [darkMode, setDarkMode] = useState(true);

  const user = useUserStore((state) => state.user);

  useEffect(() => {
    let active = true;
    Promise.all([getPoints(), getNearbyBusinesses()]).then(([pointsResult, businessesResult]) => {
      if (!active) return;
      if (pointsResult.ok) setPoints(pointsResult.data);
      else setPointsError(true);
      if (businessesResult.ok) setBusinesses(businessesResult.data);
      else setBusinessesError(true);
      setBusinessesLoading(false);
    });
    return () => {
      active = false;
    };
  }, []);
  return (
    <main className={`app-frame ${darkMode ? "dark" : "light"}`}>
      <header className="topbar">
        <div className="profile">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <div className="profile-avatar">{user?.avatarUrl ? <img src={user.avatarUrl} alt="" /> : <UserRound size={17} />}</div>
          <div>
            <span className="eyebrow">Buen día</span>
            <strong className="text-primary-foreground">{user?.name ?? "Tu cuenta"}</strong>
          </div>
        </div>
        <div className="top-actions">
          <button
            className="circle-action"
            aria-label={darkMode ? "Activar modo claro" : "Activar modo oscuro"}
            onClick={() => setDarkMode(!darkMode)}
          >
            {darkMode ? <Sun size={18} /> : <Moon size={18} />}
          </button>
          <button className="circle-action" aria-label="Notificaciones">
            <Bell size={19} />
          </button>
          <button className="circle-action" aria-label="Abrir menú" onClick={() => setMenuOpen(true)}>
            <Menu size={20} />
          </button>
        </div>
      </header>
      <PointsCard points={pointsError ? null : points} />
      <section className="section-heading">
        <div>
          <span className="eyebrow">Explorá cerca tuyo</span>
          <h2 className="text-primary-foreground">Ahora en Palermo</h2>
        </div>
        <button className="text-button">
          Ver todo <ChevronRight size={15} />
        </button>
      </section>
      <BusinessList businesses={businesses} loading={businessesLoading} error={businessesError} />
      <nav className="bottom-nav">
        <Link href="/b" className={`nav-item ${pathname === "/b" ? "text-primary" : "text-muted"}`}>
          <Home size={20} />
          <span>Inicio</span>
        </Link>
        {/* TODO: Implement actual QR scanning. */}
        <button className="scan-button" aria-label="Escanear QR">
          <QrCode size={24} />
        </button>
        <Link href="/descubrir" className={`nav-item ${pathname === "/b/descubrir" ? "text-primary" : "text-muted"}`}>
          <Compass size={20} />
          <span>Descubrir</span>
        </Link>
      </nav>
      {menuOpen && (
        <div className="menu-overlay" onClick={() => setMenuOpen(false)}>
          <aside className="side-menu" onClick={(event) => event.stopPropagation()}>
            <button className="close-menu" aria-label="Cerrar menú" onClick={() => setMenuOpen(false)}>
              <X size={20} />
            </button>
            <BrandLockup />
            <div className="menu-links">
              <Link href="/b/perfil">Mi perfil</Link>

              {/* TODO: implement these two pages. */}
              <Link href="/b/resumen">Mis recompensas</Link>
              <Link href="/b/configuracion">Configuración</Link>
            </div>
          </aside>
        </div>
      )}
    </main>
  );
}
