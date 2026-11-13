"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { Store, Plus, MapPin, Globe, Pencil, Trash2, Save, X } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Field, Input, Textarea } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/toast";
import { useModal } from "@/components/modal";
import { AddressSelector } from "./address-selector";
import { createStorefront, deactivateStorefront, updateStorefront } from "@/lib/demo/actions";
import type { Storefront } from "@/lib/demo/types";

type FormState = { message: string | null; status: "success" | "error" | null };
const initialState: FormState = { message: null, status: null };

export function StorefrontsSection({ storefronts }: { storefronts: Storefront[] }) {
  const [creating, setCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  return (
    <Card className="overflow-hidden rounded-3xl border-border bg-card shadow-[0_14px_40px_rgba(25,24,23,0.06)]" data-tour="storefronts-section">
      <CardHeader className="flex flex-row items-center justify-between border-b border-border px-5 py-5 sm:px-6">
        <CardTitle className="flex items-center gap-3 text-base tracking-[-0.02em]">
          <span className="grid size-10 place-items-center rounded-2xl bg-primary/10 text-foreground">
            <Store className="size-5" aria-hidden="true" />
          </span>
          <span>
            <span className="block">Sucursales</span>
            <span className="mt-1 block text-xs font-normal text-foreground/80">Locales físicos y online donde tus clientes suman puntos.</span>
          </span>
        </CardTitle>
        <Button type="button" variant="ghost" className="gap-1.5" onClick={() => setCreating((v) => !v)}>
          <Plus className="size-4" /> Agregar
        </Button>
      </CardHeader>

      <CardContent className="flex flex-col gap-4 px-5 py-5 sm:px-6 sm:py-6">
        {creating && <StorefrontForm onDone={() => setCreating(false)} />}

        {storefronts.length === 0 && !creating && (
          <div className="rounded-2xl border border-dashed border-border py-10 text-center text-sm text-foreground/80">Todavía no cargaste ninguna sucursal.</div>
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

function StorefrontCard({ storefront, onEdit }: { storefront: Storefront; onEdit: () => void }) {
  const { open, close, runWithStatus } = useModal();

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

function SubmitButton({ isEdit }: { isEdit: boolean }) {
  const { pending } = useFormStatus();
  return (
    <Button disabled={pending} type="submit" className="gap-1.5">
      <Save className="size-4" /> {pending ? "Guardando…" : isEdit ? "Guardar cambios" : "Crear sucursal"}
    </Button>
  );
}

function StorefrontForm({ storefront, onDone }: { storefront?: Storefront; onDone: () => void }) {
  const notify = useToast();
  const isEdit = !!storefront;
  const [online, setOnline] = useState(storefront?.online ?? false);
  const [active, setActive] = useState(storefront?.active ?? true);
  const [, formAction] = useActionState(async (_prev: FormState, formData: FormData): Promise<FormState> => {
    const input = {
      name: String(formData.get("name") ?? ""),
      online,
      province: String(formData.get("province") ?? ""),
      city: String(formData.get("city") ?? ""),
      address: String(formData.get("address") ?? ""),
      category: String(formData.get("category") ?? ""),
      color: String(formData.get("color") ?? "#d4822b"),
      hours: String(formData.get("hours") ?? ""),
      description: String(formData.get("description") ?? ""),
      active,
    };
    const result = storefront ? await updateStorefront(storefront.id, input) : await createStorefront(input);
    const next: FormState = result.ok
      ? { status: "success", message: isEdit ? "La sucursal se actualizó." : "La sucursal se creó. Ya podés asignarla a un programa de puntos." }
      : { status: "error", message: result.error };
    if (next.status === "success") onDone();
    notify(next.message!, next.status!);
    return next;
  }, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-4 rounded-2xl border border-border bg-background p-4" noValidate>
      <Field label="Nombre" htmlFor="sf-name" required>
        <Input defaultValue={storefront?.name} id="sf-name" name="name" placeholder="Café Aurora — Centro" />
      </Field>

      <div className="grid grid-cols-2 gap-1 rounded-2xl border border-border bg-card p-1.5">
        <Button
          type="button"
          onClick={() => setOnline(false)}
          variant={!online ? "default" : "ghost"}
          className={`h-10 rounded-xl text-xs font-semibold ${!online ? "bg-primary text-primary-foreground hover:bg-primary/90" : "text-foreground/80"}`}
        >
          <MapPin className="size-4" /> Física
        </Button>
        <Button
          type="button"
          onClick={() => setOnline(true)}
          variant={online ? "default" : "ghost"}
          className={`h-10 rounded-xl text-xs font-semibold ${online ? "bg-primary text-primary-foreground hover:bg-primary/90" : "text-foreground/80"}`}
        >
          <Globe className="size-4" /> Online
        </Button>
      </div>

      {!online && (
        <AddressSelector initialProvince={storefront?.province ?? undefined} initialCity={storefront?.city ?? undefined} initialAddress={storefront?.address ?? undefined} />
      )}

      <div className="grid grid-cols-2 gap-4">
        <Field label="Categoría" htmlFor="sf-category">
          <Input defaultValue={storefront?.category ?? ""} id="sf-category" name="category" placeholder="Cafetería" />
        </Field>
        <Field label="Color de marca" htmlFor="sf-color">
          <input
            type="color"
            id="sf-color"
            name="color"
            defaultValue={storefront?.color ?? "#d4822b"}
            className="h-12 w-full cursor-pointer rounded-xl border border-border bg-card"
          />
        </Field>
      </div>

      <Field label="Horario" htmlFor="sf-hours">
        <Input defaultValue={storefront?.hours ?? ""} id="sf-hours" name="hours" placeholder="Lun a Sáb · 8:00 - 21:00" />
      </Field>

      <Field label="Descripción" htmlFor="sf-desc">
        <Textarea defaultValue={storefront?.description ?? ""} id="sf-desc" name="description" rows={3} placeholder="Breve descripción de esta sucursal." />
      </Field>

      {isEdit && (
        <label className="flex items-center gap-2 text-sm w-fit">
          <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} className="size-4 accent-primary" />
          Visibilidad ({active ? "listada" : "no listada"})
        </label>
      )}

      <div className="flex justify-end gap-2">
        <Button type="button" variant="ghost" onClick={onDone} className="gap-1.5">
          <X className="size-4" /> Cancelar
        </Button>
        <SubmitButton isEdit={isEdit} />
      </div>
    </form>
  );
}
