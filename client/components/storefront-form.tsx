"use client";

import { useActionState, useEffect, useState } from "react";
import { useFormStatus } from "react-dom";
import { MapPin, Globe, Save, X } from "lucide-react";
import { Field, Input, Textarea } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/toast";
import { Storefront } from "@/lib/types/storefront";
import { FormState } from "@/app/d/types";
import { createStorefront, updateStorefront } from "@/app/d/[slug]/(admin-only)/mi-negocio/actions";
import { AddressSelector } from "./address-selector";

const initialState: FormState = { message: null, status: null };

function SubmitButton({ isEdit }: { isEdit: boolean }) {
  const { pending } = useFormStatus();
  return (
    <Button disabled={pending} type="submit" className="gap-1.5">
      <Save className="size-4" /> {pending ? "Guardando…" : isEdit ? "Guardar cambios" : "Crear sucursal"}
    </Button>
  );
}

export function StorefrontForm({ storefront, onDone }: { storefront?: Storefront; onDone: () => void }) {
  const notify = useToast();
  const isEdit = !!storefront;
  const action = isEdit ? updateStorefront.bind(null, storefront.id) : createStorefront;
  const [state, formAction] = useActionState(action, initialState);
  const [online, setOnline] = useState(storefront?.online ?? false);
  const [active, setActive] = useState(storefront?.active ?? true);

  useEffect(() => {
    if (state.status === "success") onDone();
    if (state.status) notify(state.message!, state.status);
  }, [state, notify, onDone]);

  return (
    <form action={formAction} className="flex flex-col gap-4 rounded-2xl border border-border bg-background p-4" noValidate>
      <input type="hidden" name="online" value={online ? "true" : "false"} />
      <input type="hidden" name="active" value={active ? "true" : "false"} />

      <Field label="Nombre" htmlFor="sf-name" required>
        <Input defaultValue={storefront?.name} id="sf-name" name="name" placeholder="Café Aurora — Centro" />
      </Field>

      <div className="grid grid-cols-2 gap-1 rounded-2xl border border-border bg-card p-1.5">
        <Button
          type="button"
          onClick={() => setOnline(false)}
          variant={!online ? "default" : "ghost"}
          className={`h-10 rounded-xl text-xs font-semibold ${!online ? "bg-primary text-primary-foreground hover:bg-primary/90" : "text-muted"}`}
        >
          <MapPin className="size-4" /> Física
        </Button>
        <Button
          type="button"
          onClick={() => setOnline(true)}
          variant={online ? "default" : "ghost"}
          className={`h-10 rounded-xl text-xs font-semibold ${online ? "bg-primary text-primary-foreground hover:bg-primary/90" : "text-muted"}`}
        >
          <Globe className="size-4" /> Online
        </Button>
      </div>

      {!online && (
        <AddressSelector
          initialProvince={storefront?.province ?? undefined}
          initialCity={storefront?.city ?? undefined}
          initialAddress={storefront?.address ?? undefined}
        />
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
            defaultValue={storefront?.color ?? "#f05b9d"}
            className="h-12 w-full cursor-pointer rounded-xl border border-border bg-card"
          />
        </Field>
      </div>

      <Field label="Horario" htmlFor="sf-hours">
        <Input defaultValue={storefront?.hours ?? ""} id="sf-hours" name="hours" placeholder="Lun a Sáb · 8:00 - 21:00" />
      </Field>

      <Field label="Descripción" htmlFor="sf-desc">
        <Textarea
          defaultValue={storefront?.description ?? ""}
          id="sf-desc"
          name="description"
          rows={3}
          placeholder="Breve descripción de esta sucursal."
        />
      </Field>

      {isEdit && (
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} className="size-4 accent-primary" />
          Sucursal activa
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
