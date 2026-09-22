"use client";

import { useTransition } from "react";
import { MapPin, Globe, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Storefront } from "@/lib/types/storefront";
import { useToast } from "@/components/toast";
import { deactivateStorefront } from "@/app/d/[slug]/(admin-only)/mi-negocio/actions";

export function StorefrontCard({ storefront, onEdit }: { storefront: Storefront; onEdit: () => void }) {
  const [pending, startTransition] = useTransition();
  const notify = useToast();

  const handleDeactivate = () => {
    if (!confirm(`¿Desactivar "${storefront.name}"? Dejará de aparecer para tus clientes.`)) return;
    startTransition(async () => {
      await deactivateStorefront(storefront.id);
      notify("Sucursal desactivada", "success");
    });
  };

  return (
    <div className="flex items-center justify-between gap-3 rounded-2xl border border-border bg-background px-4 py-3.5">
      <div className="flex items-center gap-3 min-w-0">
        <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
          {storefront.online ? <Globe className="size-4" /> : <MapPin className="size-4" />}
        </span>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold">{storefront.name}</p>
          <p className="truncate text-xs text-muted">
            {storefront.category ?? (storefront.online ? "Online" : "Local físico")}
            {!storefront.active && " · Inactiva"}
          </p>
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-1">
        <Button type="button" variant="ghost" size="icon" onClick={onEdit} aria-label={`Editar ${storefront.name}`}>
          <Pencil className="size-4" />
        </Button>
        <Button type="button" variant="ghost" size="icon" disabled={pending} onClick={handleDeactivate} aria-label={`Desactivar ${storefront.name}`}>
          <Trash2 className="size-4" />
        </Button>
      </div>
    </div>
  );
}
