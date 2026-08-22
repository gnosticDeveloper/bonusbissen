"use client";

import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";
// import { ReactivateButton } from "@/components/reactivate-customer-button";
import { Input, Label } from "@/components/ui/input";
import { useModal } from "@/components/modal";
import { useActionState } from "react";
import { createCustomer } from "@/app/[orgId]/dashboard/actions";
import { FormState } from "@/app/[orgId]/dashboard/types";

const initialState: FormState = {
  message: null,
  status: null,
};

export default function CreateCustomerModal({ allowPoints }: { allowPoints: boolean }) {
  const { close } = useModal();

  const [state, action] = useActionState(createCustomer, initialState);

  return (
    <form action={action} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="c-name">Nombre y apellido</Label>
        <Input id="c-name" name="name" maxLength={60} placeholder="Ej: Sofía Ramírez" />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="c-phone">Teléfono</Label>
        <Input id="c-phone" name="phone" inputMode="tel" maxLength={20} placeholder="Ej: +54 11 5512-3344" />
      </div>
      {allowPoints ? (
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="c-points">Puntos iniciales (opcional)</Label>
          <Input id="c-points" name="points" inputMode="numeric" placeholder="0" />
        </div>
      ) : null}

      {state && state.status && state.status === "error" ? <p className="text-sm text-destructive">{state.message}</p> : null}

      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={close}>
          Cancelar
        </Button>
        {/*{showReactivate ? <ReactivateButton customerId={state.customerId!} /> : <SubmitButton>Crear cliente</SubmitButton>}*/}
        <SubmitButton>Crear cliente</SubmitButton>
      </div>
    </form>
  );
}

function SubmitButton({ children }: { children: React.ReactNode }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? "Creando..." : children}
    </Button>
  );
}
