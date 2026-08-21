"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { FieldError, Input, Label } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { LoginState } from "@/app/[orgId]/dashboard/types";
import { login } from "@/app/[orgId]/dashboard/actions";

const initialState: LoginState = {
  error: null,
};

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <Button disabled={pending} type="submit" size="lg" className="w-full">
      Iniciar sesión
    </Button>
  );
}

export default function SignInForm() {
  const [state, action] = useActionState(login, initialState);

  return (
    <form action={action} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="username">Usuario</Label>
        <Input id="username" type="username" name="username" autoComplete="off" placeholder="Nombre de usuario" />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="password">Contraseña</Label>
        <Input id="password" type="password" name="password" autoComplete="current-password" placeholder="••••••••" />
      </div>
      <FieldError message={state.error} />
      <SubmitButton />
    </form>
  );
}
