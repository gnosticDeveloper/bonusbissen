import Link from "next/link";
import { CitySelect } from "@/components/city-select";
import { BusinessList } from "@/components/business-list";
import { getBusinesses } from "@/app/b/actions";

const PAGE_SIZE = 10;

export default async function DescubrirPage({ searchParams }: { searchParams: Promise<{ city?: string; size?: string }> }) {
  const params = await searchParams;
  const city = params.city;
  const size = params.size ? Number(params.size) : PAGE_SIZE;

  const businesses = await getBusinesses(size, city);

  if (!businesses.ok) return;

  const hasMore = businesses.data.length >= size;

  const nextParams = new URLSearchParams();
  if (city) nextParams.set("city", city);
  nextParams.set("size", String(size + PAGE_SIZE));

  return (
    <div className="mx-auto flex min-h-svh w-full max-w-107.5 flex-col px-4 pb-12 pt-6">
      <header className="mb-6">
        <h1 className="text-xl font-medium text-foreground">Descubrí negocios</h1>
        <p className="mt-1 text-sm text-muted">Todos los comercios afiliados a BonusBissen.</p>
      </header>

      <div className="mb-5">
        <CitySelect defaultValue={city} />
      </div>

      {businesses.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border p-6 text-center">
          <p className="text-sm text-muted">{city ? "No encontramos negocios en esta ciudad todavía." : "Todavía no hay negocios cargados."}</p>
        </div>
      ) : (
        <BusinessList businesses={businesses.data} />
      )}

      {hasMore && (
        <Link
          href={`/descubrir?${nextParams.toString()}`}
          className="mx-auto mt-6 inline-flex items-center justify-center rounded-full border border-border px-5 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-muted/10"
        >
          Cargar más
        </Link>
      )}
    </div>
  );
}
