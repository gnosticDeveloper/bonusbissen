"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { FieldError, Input, Label } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { signUp } from "@/app/(auth)/sign-up/actions";
import { AuthState } from "@/app/(auth)/sign-in/actions";

const initialState: AuthState = {
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

export default function SignUpForm() {
  const [state, action] = useActionState(signUp, initialState);

  return (
    <form action={action} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="username">Nombre de tu cuenta</Label>
        <Input id="username" type="username" name="account_name" autoComplete="off" placeholder="Tu nombre" />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="username">Usuario o correo electrónico</Label>
        <Input id="username" type="username" name="username" autoComplete="off" placeholder="Nombre de usuario o correo" />
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
