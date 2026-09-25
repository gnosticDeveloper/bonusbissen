"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";

interface PaginationControlsProps {
  page: number; // 0-indexed
  totalPages: number;
  onPageChange: (page: number) => void;
  disabled?: boolean;
  className?: string;
}

export function PaginationControls({ page, totalPages, onPageChange, disabled, className = "" }: PaginationControlsProps) {
  const isFirst = page <= 0;
  const isLast = page >= totalPages - 1;

  return (
    <nav aria-label="Paginación de negocios" className={`flex items-center justify-between gap-3 ${className}`}>
      <button
        type="button"
        onClick={() => onPageChange(page - 1)}
        disabled={disabled || isFirst}
        aria-label="Página anterior"
        className="grid h-9 w-9 place-items-center rounded-full border border-border bg-card text-foreground transition-colors duration-240 disabled:opacity-40"
      >
        <ChevronLeft size={18} />
      </button>

      <span className="text-xs text-muted">
        Página {page + 1} de {totalPages}
      </span>

      <button
        type="button"
        onClick={() => onPageChange(page + 1)}
        disabled={disabled || isLast}
        aria-label="Página siguiente"
        className="grid h-9 w-9 place-items-center rounded-full border border-border bg-card text-foreground transition-colors duration-240 disabled:opacity-40"
      >
        <ChevronRight size={18} />
      </button>
    </nav>
  );
}
