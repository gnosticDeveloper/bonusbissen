"use client";

import { Award, Plus } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PointProgram } from "@/lib/types/point-program";
import { Storefront } from "@/lib/types/storefront";
import { PointProgramCard } from "./point-program-card";
import { PointProgramForm } from "./point-program-form";
import { useModal } from "./modal";
import { ActionResult } from "@/lib/api";
import { cn } from "@/lib/helpers/utils";

const cardClass = "overflow-hidden rounded-3xl border-border bg-card shadow-[0_14px_40px_rgba(25,24,23,0.06)]";

export function PointProgramsSection({
  pointPrograms,
  storefronts,
  className,
}: {
  pointPrograms: ActionResult<PointProgram[]>;
  storefronts: ActionResult<Storefront[]>;
  className?: string;
}) {
  const { open, close } = useModal();

  if (!pointPrograms.ok) {
    return (
      <Card className={cn(cardClass, className)}>
        <CardContent className="flex flex-col gap-4 px-5 py-5 sm:px-6 sm:py-6">
          <CardDescription>{pointPrograms.error}</CardDescription>
        </CardContent>
      </Card>
    );
  }

  const storefrontsData = storefronts.ok ? storefronts.data : [];

  const activeStorefronts = storefrontsData.filter((s) => s.active);

  const openCreate = () =>
    open(<PointProgramForm pointPrograms={pointPrograms.data} storefronts={activeStorefronts} onDone={close} />, {
      title: "Nuevo programa de puntos",
      description: "Elegí cómo se llama el programa, cómo se llaman sus puntos y qué sucursales participan.",
    });

  const openEdit = (pp: PointProgram) =>
    open(<PointProgramForm pointProgram={pp} storefronts={storefrontsData} pointPrograms={pointPrograms.data} onDone={close} />, {
      title: "Editar programa de puntos",
      description: `Cambiá el nombre, el vencimiento o las sucursales de "${pp.name}".`,
    });

  return (
    <Card className={cn(cardClass, "flex min-h-0 flex-col", className)}>
      <CardHeader className="flex shrink-0 flex-row items-center justify-between border-b border-border px-5 py-5 sm:px-6">
        <CardTitle className="flex items-center gap-3 text-base tracking-[-0.02em]">
          <span className="grid size-10 place-items-center rounded-2xl bg-primary/10 text-foreground">
            <Award className="size-5" aria-hidden="true" />
          </span>
          <span>
            <span className="block">Programas de puntos</span>
            <span className="mt-1 block text-xs font-normal text-foreground/80">Cada sucursal corre un único programa.</span>
          </span>
        </CardTitle>
        <Button type="button" variant="ghost" className="gap-1.5" disabled={activeStorefronts.length === 0} aria-haspopup="dialog" onClick={openCreate}>
          <Plus className="size-4" /> Agregar
        </Button>
      </CardHeader>

      <CardContent className="flex flex-col gap-4 px-5 py-5 sm:px-6 sm:py-6 xl:min-h-0 xl:flex-1 xl:overflow-y-auto xl:overscroll-contain">
        {activeStorefronts.length === 0 && (
          <div className="rounded-2xl border border-dashed border-border py-10 text-center text-sm text-foreground/80">
            Cargá al menos una sucursal antes de crear un programa de puntos.
          </div>
        )}

        {activeStorefronts.length > 0 && pointPrograms.data.length === 0 && (
          <div className="rounded-2xl border border-dashed border-border py-10 text-center text-sm text-foreground/80">
            Todavía no creaste ningún programa de puntos.
          </div>
        )}

        {pointPrograms.data.map((pp) => (
          <PointProgramCard key={pp.id} pointProgram={pp} onEdit={() => openEdit(pp)} />
        ))}
      </CardContent>
    </Card>
  );
}
