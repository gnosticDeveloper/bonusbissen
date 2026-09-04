"use client";

import { Field, Input, Textarea } from "@/components/ui/input";
import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";
import { Clock, MapPin, Save, Type } from "lucide-react";
import { useActionState, useEffect } from "react";
import { useToast } from "@/components/toast";
import LogoDropzone from "@/components/logo-dropzone";
import { FormState } from "@/app/[orgId]/(employee)/dashboard/types";
import { Organization } from "@/lib/types/organization";
import { updateOrganization } from "@/app/[orgId]/(employee)/dashboard/(admin-only)/your-org/actions";

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <Button disabled={pending} type="submit" className="gap-1.5">
      <Save className="size-4" /> Guardar cambios
    </Button>
  );
}

const initialState: FormState = {
  message: null,
  status: null,
};

export function OrganizationForm({ org }: { org: Organization }) {
  const notify = useToast();

  const [state, formAction] = useActionState(updateOrganization, initialState);

  useEffect(() => {
    if (!state.status) return;

    notify(state.message!, state.status);
  }, [state, notify]);

  return (
    <form action={formAction} className="grid gap-5">
      <div className="grid grid-cols-[auto_1fr] gap-5">
        <LogoDropzone initialLogoUrl={org.iconUrl ?? null} />

        <div className="grid gap-5">
          <Field label="Nombre del negocio" htmlFor="org-name" required>
            <Input defaultValue={org.name} id="org-name" name="org-name" placeholder="Café Aurora" icon={<Type className="size-4" />} />
          </Field>

          <Field label="Dirección" htmlFor="org-address">
            <Input
              defaultValue={org.address}
              id="org-address"
              name="org-address"
              placeholder="Av. Siempreviva 742, Springfield"
              icon={<MapPin className="size-4" />}
            />
          </Field>
        </div>
      </div>

      <Field label="Horario de atención" htmlFor="org-hours">
        <Input defaultValue={org.hours} id="org-hours" name="org-hours" placeholder="Lun a Sáb · 8:00 - 21:00" icon={<Clock className="size-4" />} />
      </Field>

      <Field label="Descripción" htmlFor="org-desc">
        <Textarea
          defaultValue={org.description}
          id="org-desc"
          name="org-desc"
          placeholder="Breve descripción de tu negocio y programa de lealtad."
          rows={3}
        />
      </Field>

      <div className="flex justify-end">
        <SubmitButton />
      </div>
    </form>
  );
}
