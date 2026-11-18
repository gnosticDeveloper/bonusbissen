"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { Building2, Save, Smartphone, Type } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Field, Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/toast";
import { useModal } from "@/components/modal";
import { Organization } from "@/lib/types/organization";
import { PointProgram } from "@/lib/types/point-program";
import { Storefront } from "@/lib/types/storefront";
import { FormState } from "@/lib/types/dashboard";
import { updateOrganization, uploadOrganizationImage } from "@/app/d/[slug]/(admin-only)/mi-negocio/actions";
import { ImageUploadField } from "@/components/image-upload-field";
import { StorefrontPreview } from "@/components/storefront-preview";
import { ActionResult } from "@/lib/api";
import { cn } from "@/lib/helpers/utils";

const initialState: FormState = { message: null, status: null };

const cardClass = "overflow-hidden rounded-3xl border-border bg-card shadow-[0_14px_40px_rgba(25,24,23,0.06)]";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button disabled={pending} type="submit" className="h-10 gap-1.5 px-3.5">
      <Save className="size-4" /> Guardar cambios
    </Button>
  );
}

export function OrganizationSection({
  org,
  storefronts,
  pointPrograms,
  className,
}: {
  org: ActionResult<Organization>;
  storefronts: ActionResult<Storefront[]>;
  pointPrograms: ActionResult<PointProgram[]>;
  className?: string;
}) {
  const notify = useToast();
  const { open } = useModal();
  const [, formAction] = useActionState(async (prev: FormState, formData: FormData) => {
    const next = await updateOrganization(prev, formData);
    if (next.status) notify(next.message!, next.status);
    return next;
  }, initialState);

  if (!org.ok) {
    return (
      <Card className={cn(cardClass, "items-center justify-center", className)}>
        <CardContent className="px-5 py-5 sm:px-6 sm:py-6">
          <CardDescription>{org.error}</CardDescription>
        </CardContent>
      </Card>
    );
  }

  const openPreview = () =>
    open(
      <StorefrontPreview
        org={org.data}
        storefronts={storefronts.ok ? storefronts.data : []}
        pointPrograms={pointPrograms.ok ? pointPrograms.data : []}
      />,
      {
        title: "Así ven tus clientes tu negocio",
        description: "Es la pantalla principal de la sucursal en el celular, con tu logo, tu banner y el color de esa sucursal. El saldo de puntos es un ejemplo.",
      },
    );

  return (
    <Card className={cn(cardClass, "flex flex-col xl:min-h-0", className)}>
      <CardHeader className="shrink-0 border-b border-border px-5 py-5 sm:px-6">
        <CardTitle className="flex items-center gap-3 text-base tracking-[-0.02em]">
          <span className="grid size-10 place-items-center rounded-2xl bg-primary/10 text-foreground">
            <Building2 className="size-5" aria-hidden="true" />
          </span>
          <span>
            <span className="block">Datos del negocio</span>
            <span className="mt-1 block text-xs font-normal text-foreground/80">El nombre y las imágenes con las que te ven tus clientes en la app.</span>
          </span>
        </CardTitle>
      </CardHeader>

      <CardContent className="flex flex-1 flex-col gap-6 px-5 py-5 sm:px-6 sm:py-6 xl:min-h-0 xl:overflow-y-auto">
        <form action={formAction} className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end" noValidate>
          <Field label="Nombre del negocio" htmlFor="org-name" required>
            <Input defaultValue={org.data.name} id="org-name" name="org-name" placeholder="Café Aurora" icon={<Type className="size-4" />} />
          </Field>
          <div className="flex justify-end">
            <SubmitButton />
          </div>
        </form>

        <div className="grid grid-cols-[auto_minmax(0,1fr)] items-start gap-4 border-t border-border pt-6 sm:gap-6">
          <ImageUploadField label="Logo" initialUrl={org.data.logoUrl} showHint={false} upload={(data) => uploadOrganizationImage("logo", data)} />
          <ImageUploadField
            label="Banner"
            initialUrl={org.data.bannerUrl}
            shape="banner"
            showHint={false}
            upload={(data) => uploadOrganizationImage("banner", data)}
          />
          <div className="col-span-2 flex flex-col gap-1 text-xs leading-relaxed text-foreground/75">
            <p>WEBP, JPG, JPEG o PNG · máximo 2 MB. Hacé clic en la imagen para cambiarla.</p>
            <p>El banner se recorta para llenar la pantalla de cada dispositivo: dejá lo importante cerca del centro.</p>
          </div>
        </div>

        <div className="mt-auto flex flex-col gap-4 rounded-2xl border border-primary/30 bg-primary/10 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-start gap-3">
            <span className="grid size-10 shrink-0 place-items-center rounded-2xl bg-background text-foreground">
              <Smartphone className="size-5" aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <p className="text-sm font-semibold">Así te ven tus clientes</p>
              <p className="mt-0.5 text-xs leading-relaxed text-foreground/80">Revisá que el logo se lea bien y que el banner no recorte nada importante en el celular.</p>
            </div>
          </div>
          <Button type="button" variant="outline" className="h-10 gap-1.5 px-3.5" aria-haspopup="dialog" onClick={openPreview}>
            <Smartphone className="size-4" aria-hidden="true" /> Ver en el celular
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
