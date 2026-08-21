import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { formatDate, formatPoints, parsePositiveInt } from "@/lib/format";
import { Pencil, Search, Trash2, Users } from "lucide-react";
import { getAllCustomers } from "@/app/dashboard/actions";
import CreateCustomerButton from "@/components/create-customer-button";

export default async function CustomersManagerPage({ searchParams }: { searchParams: Promise<{ [key: string]: string | undefined }> }) {
  const search = (await searchParams).search;
  const rawPage = (await searchParams).page;

  const page = parsePositiveInt(rawPage ?? "") ?? 0;
  const filtered = await getAllCustomers(search, page);
  const isAdmin = true;

  return (
    <div className="flex h-full flex-col gap-4">
      <div className="flex items-center justify-between gap-2">
        <div className="flex flex-col">
          <h2 className="text-lg font-semibold">Clientes</h2>
          <p className="text-sm text-muted-foreground">
            {isAdmin ? "Gestioná la información de tus clientes." : "Consultá y creá clientes. La edición y baja están reservadas al dueño."}
          </p>
        </div>
        <CreateCustomerButton />
      </div>

      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input className="pl-9" placeholder="Buscar por nombre o teléfono…" />
      </div>

      <Card className="flex-1 overflow-hidden">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center gap-2 p-10 text-center">
            <Users className="size-6 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">{search ? "No hay clientes que coincidan con la búsqueda." : "Todavía no hay clientes."}</p>
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {filtered.map((c) => (
              <li key={c.id} className="flex items-center gap-3 p-3 sm:px-4">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/15 text-sm font-semibold text-primary">
                  {c.name
                    .split(" ")
                    .slice(0, 2)
                    .map((p) => p[0])
                    .join("")}
                </span>
                <div className="flex min-w-0 flex-1 flex-col">
                  <span className="truncate text-sm font-semibold">{c.name}</span>
                  <span className="truncate text-xs text-muted-foreground">
                    {c.phone} · alta {formatDate(c.createdAt)}
                  </span>
                </div>
                <div className="flex flex-col items-end">
                  <span className="text-sm font-bold text-primary">{formatPoints(c.points)}</span>
                  <span className="text-[0.65rem] uppercase tracking-wide text-muted-foreground">puntos</span>
                </div>
                {isAdmin ? (
                  <div className="ml-1 flex gap-1">
                    <Button variant="ghost" size="icon-sm" aria-label="Editar cliente" onClick={() => setEditing(c)}>
                      <Pencil />
                    </Button>
                    <Button variant="ghost" size="icon-sm" aria-label="Dar de baja cliente" onClick={() => setRemoving(c)}>
                      <Trash2 className="text-destructive" />
                    </Button>
                  </div>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Modal
        open={!!removing}
        onClose={() => setRemoving(null)}
        title="Dar de baja cliente"
        description="Se eliminará el cliente de la lista. Sus canjes previos quedarán registrados."
      >
        {removing ? (
          <div className="flex flex-col gap-4">
            <p className="text-sm text-muted-foreground">
              ¿Seguro que querés dar de baja a <span className="font-semibold text-foreground">{removing.name}</span>?
            </p>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setRemoving(null)}>
                Cancelar
              </Button>
              <Button
                variant="destructive"
                onClick={() => {
                  deleteCustomer(removing.id);
                  notify("Cliente dado de baja.");
                  setRemoving(null);
                }}
              >
                Dar de baja
              </Button>
            </div>
          </div>
        ) : null}
      </Modal>
    </div>
  );
}
