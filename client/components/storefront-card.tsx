"use client";

import { MapPin, Globe, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Storefront } from "@/lib/types/storefront";
import { deactivateStorefront } from "@/app/d/[slug]/(admin-only)/mi-negocio/actions";
import { useModal } from "./modal";

export function StorefrontCard({ storefront, onEdit }: { storefront: Storefront; onEdit: () => void }) {
  const { open, close, runWithStatus } = useModal();

  // runWithStatus swaps the confirmation for a loading view, so the button
  // can't be pressed twice, then shows the backend's answer.
  const confirmDeactivation = () =>
    runWithStatus(() => deactivateStorefront(storefront.id), {
      loading: { title: "Desactivando sucursal", description: `Estamos desactivando "${storefront.name}".` },
      success: { title: "Sucursal desactivada", description: `"${storefront.name}" ya no aparece para tus clientes.` },
      errorTitle: "No pudimos desactivar la sucursal",
    });

  const handleDeactivate = () => {
    open(
      <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
        <Button type="button" variant="outline" onClick={close}>
          Cancelar
        </Button>
        <Button type="button" variant="destructive" onClick={() => void confirmDeactivation()}>
          Desactivar sucursal
        </Button>
      </div>,
      {
        title: "¿Desactivar esta sucursal?",
        description: `"${storefront.name}" va a dejar de aparecer para tus clientes. Podés volver a activarla desde Editar.`,
      },
    );
  };

  return (
    <div className="flex items-center justify-between gap-3 rounded-2xl border border-border bg-background px-4 py-3.5">
      <div className="flex items-center gap-3 min-w-0">
        <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-primary/10 text-foreground">
          {storefront.online ? <Globe className="size-4" /> : <MapPin className="size-4" />}
        </span>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold">{storefront.name}</p>
          <p className="truncate text-xs text-foreground/80">
            {storefront.category ?? (storefront.online ? "Online" : "Local físico")}
            {!storefront.active && " · Inactiva"}
          </p>
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-1">
        <Button type="button" variant="ghost" onClick={onEdit} aria-label={`Editar ${storefront.name}`}>
          <Pencil className="size-4" /> Editar
        </Button>
        {storefront.active ? (
          <Button type="button" variant="ghost" onClick={handleDeactivate} aria-haspopup="dialog" aria-label={`Desactivar ${storefront.name}`}>
            <Trash2 className="size-4" /> Desactivar
          </Button>
        ) : null}
      </div>
    </div>
  );
}
