import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { parsePositiveInt } from "@/lib/format";
import { Search, Users } from "lucide-react";
import { getAllCustomers } from "@/app/[orgId]/dashboard/actions";
import CreateCustomerButton from "@/components/create-customer-button";
import { CustomerList } from "@/components/customer-list";
import { PageText } from "@/components/customer-page-text";

export default async function CustomersManagerPage({ searchParams }: { searchParams: Promise<{ [key: string]: string | undefined }> }) {
  const search = (await searchParams).search;
  const rawPage = (await searchParams).page;

  const page = parsePositiveInt(rawPage ?? "") ?? 0;
  const { items: filtered, totalElements } = await getAllCustomers(search, page);

  return (
    <div className="flex h-full flex-col gap-4">
      <div className="flex items-center justify-between gap-2">
        <div className="flex flex-col">
          <h2 className="text-lg font-semibold">Clientes</h2>
          <PageText />
        </div>
        <CreateCustomerButton />
      </div>

      <div className="relative">
        {/*TODO: implement searching functionality */}
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input className="pl-9" placeholder="Buscar por nombre o teléfono…" />
      </div>

      <Card className="flex-1 overflow-hidden">
        {totalElements === 0 ? (
          <div className="flex flex-col items-center gap-2 p-10 text-center">
            <Users className="size-6 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">{search ? "No hay clientes que coincidan con la búsqueda." : "Todavía no hay clientes."}</p>
          </div>
        ) : (
          <CustomerList customers={filtered} />
        )}
      </Card>
    </div>
  );
}
