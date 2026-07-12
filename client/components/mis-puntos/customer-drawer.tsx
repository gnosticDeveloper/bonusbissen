"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Gift, Ticket, Receipt, LogOut, X, Sparkles } from "lucide-react";

type CustomerDrawerProps = {
  isOpen: boolean;
  onCloseAction: () => void;
  name: string;
  points: number;
};

export default function CustomerDrawer({
  isOpen,
  onCloseAction,
  name,
  points,
}: CustomerDrawerProps) {
  const router = useRouter();

  if (!isOpen) return null;

  async function handleLogout() {
    // Mock: en la versión real, esto llama a /api/logout para borrar la
    // cookie httpOnly antes de redirigir.
    onCloseAction();
    router.push("/mis-puntos/login");
  }

  return (
    <div className="fixed inset-0 z-40">
      <div className="absolute inset-0 bg-ink/40" onClick={onCloseAction} />

      <div className="absolute top-0 left-0 h-full w-72 bg-cream flex flex-col shadow-xl">
        <div className="px-6 py-6 flex flex-col gap-1">
          <button
            onClick={onCloseAction}
            className="self-end p-1 -mr-1 mb-2 rounded-full hover:bg-ink/5 transition-colors"
            aria-label="Cerrar menú"
          >
            <X className="h-5 w-5 text-ink-soft" />
          </button>
          <p className="text-2xl font-bold text-ink">{name}</p>
          <div className="flex items-center gap-1.5 text-amber-dark">
            <Sparkles className="h-4 w-4" />
            <p className="text-lg font-semibold">{points} puntos</p>
          </div>
        </div>

        <hr className="border-ink/10" />

        <nav className="flex-1 flex flex-col gap-1 px-4 py-4">
          <Link
            href="/mis-puntos"
            onClick={onCloseAction}
            className="flex items-center gap-3 rounded-xl px-4 py-3 text-xl text-ink hover:bg-ink/5 transition-colors"
          >
            <Gift className="h-5 w-5" />
            Recompensas
          </Link>
          <Link
            href="/mis-puntos/canjes"
            onClick={onCloseAction}
            className="flex items-center gap-3 rounded-xl px-4 py-3 text-xl text-ink hover:bg-ink/5 transition-colors"
          >
            <Ticket className="h-5 w-5" />
            Mis canjes
          </Link>
          <Link
            href="/mis-puntos/movimientos"
            onClick={onCloseAction}
            className="flex items-center gap-3 rounded-xl px-4 py-3 text-xl text-ink hover:bg-ink/5 transition-colors"
          >
            <Receipt className="h-5 w-5" />
            Movimientos
          </Link>
        </nav>

        <div className="px-4 py-4">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 rounded-xl px-4 py-3 text-xl text-rust hover:bg-rust/10 transition-colors"
          >
            <LogOut className="h-5 w-5" />
            Cerrar sesión
          </button>
        </div>
      </div>
    </div>
  );
}
