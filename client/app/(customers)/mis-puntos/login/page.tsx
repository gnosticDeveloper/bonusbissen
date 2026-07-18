"use client";

import { useActionState } from "react";
import { Sparkles } from "lucide-react";
import AppTitle from "@/components/app-title";
import { useFormStatus } from "react-dom";
import Form from "next/form";
import { loginCustomer, LoginState } from "../../actions";

const initialState: LoginState = {
  error: null,
};

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full rounded-2xl bg-amber px-6 py-4 text-xl font-semibold text-cream hover:bg-amber-dark transition-colors disabled:cursor-not-allowed"
    >
      {pending ? "Ingresando..." : "Ingresar"}
    </button>
  );
}

export default function LoginClientePage() {
  const [state, action] = useActionState(loginCustomer, initialState);

  return (
    <div className="min-h-screen flex items-center justify-center px-6 py-12">
      <div className="w-full max-w-sm flex flex-col items-center gap-8">
        <div className="flex flex-col items-center gap-3 text-center">
          <div className="rounded-full bg-amber/15 p-4">
            <Sparkles className="h-8 w-8 text-amber-dark" />
          </div>
          <AppTitle />
          <p className="text-xl text-ink-soft">Ingresá tu teléfono para ver tus puntos</p>
        </div>

        <Form action={action} className="w-full flex flex-col gap-4">
          <input
            name="phone"
            type="tel"
            required
            placeholder="Ej: 3462 455123"
            className="w-full rounded-2xl border border-ink/15 bg-cream-dark/30 px-5 py-4 text-xl text-ink placeholder:text-ink-soft/70 outline-none focus:border-amber text-center"
          />
          {state.error && <p className="text-red-500 text-sm font-mono">{state.error}</p>}

          <SubmitButton />
        </Form>
      </div>
    </div>
  );
}
