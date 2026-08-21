import { Card } from "@/components/ui/card";
import { Building2 } from "lucide-react";
import { OrganizationForm } from "@/components/organization-form";
import { getOrganization } from "@/app/[orgId]/dashboard/actions";

export default async function OrganizationSettingsPage() {
  const org = await getOrganization();

  return (
    <div className="mx-auto max-w-2xl">
      <Card className="p-6">
        <div className="mb-6 flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Building2 className="size-5" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-foreground">Datos del negocio</h2>
            <p className="text-sm text-muted-foreground">Esta información se muestra a tus clientes en la app.</p>
          </div>
        </div>

        <OrganizationForm org={org} />
      </Card>
    </div>
  );
}
