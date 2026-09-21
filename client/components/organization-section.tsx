// components/organization-section.tsx
"use client";

import { useActionState, useEffect } from "react";
import { useFormStatus } from "react-dom";
import { Building2, Save, Type } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Field, Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/toast";
import { Organization } from "@/lib/types/organization";
import { FormState } from "@/app/d/types";
import { updateOrganization } from "@/app/d/[slug]/(admin-only)/mi-negocio/actions";

const initialState: FormState = { message: null, status: null };

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button disabled={pending} type="submit" className="gap-1.5">
      <Save className="size-4" /> Guardar cambios
    </Button>
  );
}

export function OrganizationSection({ org }: { org: Organization }) {
  const notify = useToast();
  const [state, formAction] = useActionState(updateOrganization, initialState);

  useEffect(() => {
    if (!state.status) return;
    notify(state.message!, state.status);
  }, [state, notify]);

  return (
    <Card className="overflow-hidden rounded-3xl border-border bg-card shadow-[0_14px_40px_rgba(25,24,23,0.06)]">
      <CardHeader className="border-b border-border px-5 py-5 sm:px-6">
        <CardTitle className="flex items-center gap-3 text-base tracking-[-0.02em]">
          <span className="grid size-10 place-items-center rounded-2xl bg-primary/10 text-primary">
            <Building2 className="size-5" aria-hidden="true" />
          </span>
          <span>
            <span className="block">Datos del negocio</span>
            <span className="mt-1 block text-xs font-normal text-muted">El nombre con el que te ven tus clientes en la app.</span>
          </span>
        </CardTitle>
      </CardHeader>

      <CardContent className="px-5 py-5 sm:px-6 sm:py-6">
        <form action={formAction} className="flex flex-col gap-5" noValidate>
          <Field label="Nombre del negocio" htmlFor="org-name" required>
            <Input defaultValue={org.name} id="org-name" name="org-name" placeholder="Café Aurora" icon={<Type className="size-4" />} />
          </Field>
          <div className="flex justify-end">
            <SubmitButton />
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
