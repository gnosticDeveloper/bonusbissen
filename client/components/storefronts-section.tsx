"use client";

import { useState } from "react";
import { Store, Plus } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Storefront } from "@/lib/types/storefront";
import { StorefrontCard } from "./storefront-card";
import { StorefrontForm } from "./storefront-form";

export function StorefrontsSection({ storefronts }: { storefronts: Storefront[] }) {
  const [creating, setCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  return (
    <Card className="overflow-hidden rounded-3xl border-border bg-card shadow-[0_14px_40px_rgba(25,24,23,0.06)]">
      <CardHeader className="flex flex-row items-center justify-between border-b border-border px-5 py-5 sm:px-6">
        <CardTitle className="flex items-center gap-3 text-base tracking-[-0.02em]">
          <span className="grid size-10 place-items-center rounded-2xl bg-primary/10 text-primary">
            <Store className="size-5" aria-hidden="true" />
          </span>
          <span>
            <span className="block">Sucursales</span>
            <span className="mt-1 block text-xs font-normal text-muted">Locales físicos y online donde tus clientes suman puntos.</span>
          </span>
        </CardTitle>
        <Button type="button" variant="ghost" className="gap-1.5" onClick={() => setCreating((v) => !v)}>
          <Plus className="size-4" /> Agregar
        </Button>
      </CardHeader>

      <CardContent className="flex flex-col gap-4 px-5 py-5 sm:px-6 sm:py-6">
        {creating && <StorefrontForm onDone={() => setCreating(false)} />}

        {storefronts.length === 0 && !creating && (
          <div className="rounded-2xl border border-dashed border-border py-10 text-center text-sm text-muted">
            Todavía no cargaste ninguna sucursal.
          </div>
        )}

        {storefronts.map((sf) =>
          editingId === sf.id ? (
            <StorefrontForm key={sf.id} storefront={sf} onDone={() => setEditingId(null)} />
          ) : (
            <StorefrontCard key={sf.id} storefront={sf} onEdit={() => setEditingId(sf.id)} />
          ),
        )}
      </CardContent>
    </Card>
  );
}
