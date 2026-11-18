"use client";

import { Store, Plus } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Storefront } from "@/lib/types/storefront";
import { StorefrontCard } from "./storefront-card";
import { StorefrontForm } from "./storefront-form";
import { useModal } from "./modal";
import { ActionResult } from "@/lib/api";
import { cn } from "@/lib/helpers/utils";

const cardClass = "overflow-hidden rounded-3xl border-border bg-card shadow-[0_14px_40px_rgba(25,24,23,0.06)]";

export function StorefrontsSection({ storefronts, className }: { storefronts: ActionResult<Storefront[]>; className?: string }) {
  const { open, close } = useModal();

  const openCreate = () =>
    open(<StorefrontForm onDone={close} />, {
      title: "Nueva sucursal",
      description: "Cargá un local físico o una tienda online donde tus clientes puedan sumar puntos.",
    });

  const openEdit = (sf: Storefront) =>
    open(<StorefrontForm storefront={sf} onDone={close} />, {
      title: "Editar sucursal",
      description: `Cambiá los datos de "${sf.name}".`,
    });

  if (!storefronts.ok) {
    return (
      <Card className={cn(cardClass, className)}>
        <CardContent className="px-5 py-5 sm:px-6 sm:py-6">
          <CardDescription>{storefronts.error}</CardDescription>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn(cardClass, "flex min-h-0 flex-col", className)} data-guide="storefronts-section">
      <CardHeader className="flex shrink-0 flex-row items-center justify-between border-b border-border px-5 py-5 sm:px-6">
        <CardTitle className="flex items-center gap-3 text-base tracking-[-0.02em]">
          <span className="grid size-10 place-items-center rounded-2xl bg-primary/10 text-foreground">
            <Store className="size-5" aria-hidden="true" />
          </span>
          <span>
            <span className="block">Sucursales</span>
            <span className="mt-1 block text-xs font-normal text-foreground/80">Locales físicos y online donde tus clientes suman puntos.</span>
          </span>
        </CardTitle>
        <Button type="button" variant="ghost" className="gap-1.5" aria-haspopup="dialog" onClick={openCreate}>
          <Plus className="size-4" /> Agregar
        </Button>
      </CardHeader>

      <CardContent className="flex flex-col gap-4 px-5 py-5 sm:px-6 sm:py-6 xl:min-h-0 xl:flex-1 xl:overflow-y-auto xl:overscroll-contain">
        {storefronts.data.length === 0 && (
          <div className="rounded-2xl border border-dashed border-border py-10 text-center text-sm text-foreground/80">
            Todavía no cargaste ninguna sucursal.
          </div>
        )}

        {storefronts.data.map((sf) => (
          <StorefrontCard key={sf.id} storefront={sf} onEdit={() => openEdit(sf)} />
        ))}
      </CardContent>
    </Card>
  );
}
