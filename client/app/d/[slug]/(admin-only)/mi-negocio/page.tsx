import { OrganizationSection } from "@/components/organization-section";
import { PointProgramsSection } from "@/components/point-programs-section";
import { StorefrontsSection } from "@/components/storefronts-section";
import { getOrganization, getPointPrograms, getStorefronts } from "./actions";

export default async function MiNegocioPage() {
  const [org, storefronts, pointPrograms] = await Promise.all([
    getOrganization(),
    getStorefronts(),
    getPointPrograms(),
  ]);
  return (
    <main className="mx-auto w-full max-w-2xl text-foreground min-h-full">
      <header className="mb-7">
        <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">Panel de administración</p>
        <h1 className="text-3xl font-semibold tracking-tighter sm:text-4xl">Mi negocio</h1>
        <p className="mt-2 text-sm leading-6 text-muted">Gestioná los datos de tu negocio, tus sucursales y tus programas de puntos.</p>
      </header>

      <div className="flex flex-col gap-6">
        <OrganizationSection org={org!} />
        <StorefrontsSection storefronts={storefronts} />
        <PointProgramsSection pointPrograms={pointPrograms} storefronts={storefronts} />
      </div>
    </main>
  );
}
