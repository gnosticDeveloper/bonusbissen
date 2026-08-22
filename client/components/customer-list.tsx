"use client";

import { Button } from "@/components/ui/button";
import { useModal } from "@/components/modal";
import { useToast } from "@/components/toast";
import { deleteCustomerById } from "@/app/(customers)/actions";
import { formatDate, formatPoints } from "@/lib/format";
import { Pencil, Trash2 } from "lucide-react";
import { useEmployeeAuth } from "@/providers/auth-provider";
import { CustomerPointsResponse } from "@/app/[orgId]/dashboard/actions";

function DeleteCustomerModal({ customer }: { customer: CustomerPointsResponse }) {
  const { close } = useModal();
  const notify = useToast();

  const handler = async () => {
    const result = await deleteCustomerById(customer.id);

    if (result.ok) {
      notify("Cliente dado de baja.", "success");
      close();
      return;
    }

    console.error("Error en DeleteCustomerModal. El cliente no se pudo eliminar: ", result.error);
    console.info("Código de error:", result.error);
    notify("Hubo un error al eliminar al cliente.", "error");
  };

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-muted-foreground">
        ¿Seguro que querés dar de baja a <span className="font-semibold text-foreground">{customer.name}</span>?
      </p>
      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={close}>
          Cancelar
        </Button>
        <Button variant="destructive" onClick={handler}>
          Dar de baja
        </Button>
      </div>
    </div>
  );
}

export function CustomerList({ customers }: { customers: CustomerPointsResponse[] }) {
  const { open } = useModal();

  const user = useEmployeeAuth();

  const isAdmin = user?.role === "ADMIN";

  return (
    <ul className="divide-y divide-border">
      {customers.map((c) => (
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
              {c.phone} · alta {c.formattedCreatedAt}
            </span>
          </div>
          <div className="flex flex-col items-end">
            <span className="text-sm font-bold text-primary">{formatPoints(c.points)}</span>
            <span className="text-[0.65rem] uppercase tracking-wide text-muted-foreground">puntos</span>
          </div>
          {isAdmin ? (
            <div className="ml-1 flex gap-1">
              <Button variant="ghost" size="icon-sm" aria-label="Editar cliente" onClick={() => {}}>
                <Pencil />
              </Button>
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label="Dar de baja cliente"
                onClick={() =>
                  open(<DeleteCustomerModal customer={c} />, {
                    title: "Dar de baja cliente",
                    description: "Se eliminará el cliente de la lista. Sus canjes previos quedarán registrados.",
                  })
                }
              >
                <Trash2 className="text-destructive" />
              </Button>
            </div>
          ) : null}
        </li>
      ))}
    </ul>
  );
}
