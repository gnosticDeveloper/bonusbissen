"use client";

import { useState } from "react";
import { Award, Plus } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PointProgram } from "@/lib/types/point-program";
import { Storefront } from "@/lib/types/storefront";
import { PointProgramCard } from "./point-program-card";
import { PointProgramForm } from "./point-program-form";

export function PointProgramsSection({ pointPrograms, storefronts }: { pointPrograms: PointProgram[]; storefronts: Storefront[] }) {
  const [creating, setCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const activeStorefronts = storefronts.filter((s) => s.active);

  return (
    <Card className="overflow-hidden rounded-3xl border-border bg-card shadow-[0_14px_40px_rgba(25,24,23,0.06)]">
      <CardHeader className="flex flex-row items-center justify-between border-b border-border px-5 py-5 sm:px-6">
        <CardTitle className="flex items-center gap-3 text-base tracking-[-0.02em]">
          <span className="grid size-10 place-items-center rounded-2xl bg-primary/10 text-primary">
            <Award className="size-5" aria-hidden="true" />
          </span>
          <span>
            <span className="block">Programas de puntos</span>
            <span className="mt-1 block text-xs font-normal text-muted">Cada sucursal corre un único programa.</span>
          </span>
        </CardTitle>
        <Button
          type="button"
          variant="ghost"
          className="gap-1.5"
          disabled={activeStorefronts.length === 0}
          onClick={() => setCreating((v) => !v)}
        >
          <Plus className="size-4" /> Agregar
        </Button>
      </CardHeader>

      <CardContent className="flex flex-col gap-4 px-5 py-5 sm:px-6 sm:py-6">
        {activeStorefronts.length === 0 && (
          <div className="rounded-2xl border border-dashed border-border py-10 text-center text-sm text-muted">
            Cargá al menos una sucursal antes de crear un programa de puntos.
          </div>
        )}

        {creating && (
          <PointProgramForm pointPrograms={pointPrograms} storefronts={activeStorefronts} onDone={() => setCreating(false)} />
        )}

        {activeStorefronts.length > 0 && pointPrograms.length === 0 && !creating && (
          <div className="rounded-2xl border border-dashed border-border py-10 text-center text-sm text-muted">
            Todavía no creaste ningún programa de puntos.
          </div>
        )}

        {pointPrograms.map((pp) =>
          editingId === pp.id ? (
            <PointProgramForm
              key={pp.id}
              pointProgram={pp}
              pointPrograms={pointPrograms}
              storefronts={storefronts}
              onDone={() => setEditingId(null)}
            />
          ) : (
            <PointProgramCard key={pp.id} pointProgram={pp} onEdit={() => setEditingId(pp.id)} />
          ),
        )}
      </CardContent>
    </Card>
  );
}
