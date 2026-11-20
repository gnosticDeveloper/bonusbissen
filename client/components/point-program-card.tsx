"use client";

import { Award, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PointProgram } from "@/lib/types/point-program";
import { ActionsMenu } from "./actions-menu";

/** One program as a row, laid out like `StorefrontCard`. */
export function PointProgramCard({ pointProgram, onEdit }: { pointProgram: PointProgram; onEdit: () => void }) {
  const storefrontNames = pointProgram.storefronts.map((sf) => sf.name).join(", ");

  return (
    <div className="flex items-center justify-between gap-3 rounded-2xl border border-border bg-background px-4 py-3.5">
      <div className="flex min-w-0 items-center gap-3">
        <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-primary/10 text-foreground">
          <Award className="size-4" />
        </span>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold">{pointProgram.name}</p>
          <p className="truncate text-xs text-foreground/80">
            {pointProgram.unitLabel || "puntos"}
            {" · "}
            {pointProgram.expirationMonths == null ? "Sin vencimiento" : `Vencimiento: ${pointProgram.expirationMonths} meses`}
            {!pointProgram.active && " · Inactivo"}
          </p>
          <p className="truncate text-xs text-foreground/80" title={storefrontNames || undefined}>
            {storefrontNames ? `Sucursales: ${storefrontNames}` : "Sin sucursales asignadas"}
          </p>
        </div>
      </div>
      <ActionsMenu label={`Acciones de ${pointProgram.name}`} className="shrink-0 sm:hidden" items={[{ label: "Editar", icon: <Pencil />, onSelect: onEdit }]} />
      <Button type="button" variant="ghost" onClick={onEdit} aria-haspopup="dialog" aria-label={`Editar ${pointProgram.name}`} className="hidden sm:inline-flex">
        <Pencil className="size-4" /> Editar
      </Button>
    </div>
  );
}
