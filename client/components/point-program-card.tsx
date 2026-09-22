"use client";

import { Award, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PointProgram } from "@/lib/types/point-program";

export function PointProgramCard({ pointProgram, onEdit }: { pointProgram: PointProgram; onEdit: () => void }) {
  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-border bg-background px-4 py-3.5">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
            <Award className="size-4" />
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">{pointProgram.name}</p>
            <p className="truncate text-xs text-muted">
              {pointProgram.unitLabel ?? "puntos"}
              {!pointProgram.active && " · Inactivo"}
            </p>
          </div>
        </div>
        <Button type="button" variant="ghost" size="icon" onClick={onEdit} aria-label={`Editar ${pointProgram.name}`}>
          <Pencil className="size-4" />
        </Button>
      </div>

      <div className="flex flex-wrap gap-1.5 pl-12">
        {pointProgram.storefronts.length === 0 ? (
          <span className="text-xs text-muted">Sin sucursales asignadas</span>
        ) : (
          pointProgram.storefronts.map((sf) => (
            <span key={sf.id} className="rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary">
              {sf.name}
            </span>
          ))
        )}
      </div>
    </div>
  );
}
