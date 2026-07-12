"use client";

import { Menu } from "lucide-react";

export default function CustomerHeader({ onMenuClickAction }: { onMenuClickAction: () => void }) {
  return (
    <header className="fixed top-0 left-0 right-0 z-30 h-16 bg-cream border-b border-ink/10 flex items-center px-4">
      <button
        onClick={onMenuClickAction}
        className="p-2 -ml-2 rounded-full hover:bg-ink/5 transition-colors"
        aria-label="Abrir menú"
      >
        <Menu className="h-6 w-6 text-ink" />
      </button>

      <div className="flex-1 flex justify-center">
        <span className="text-xl font-bold text-ink">La vieja estación</span>
      </div>

      {/* Espaciador para que el texto quede centrado de verdad, compensando
          el ancho del botón de la izquierda */}
      <div className="w-10" />
    </header>
  );
}
