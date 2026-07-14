"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import Form from "next/form";
import { login, LoginState } from "@/app/(employees)/actions";

const initialState: LoginState = {
  error: null,
};

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full rounded-2xl bg-amber px-6 py-4 text-xl font-semibold text-cream hover:bg-amber-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {pending ? "Ingresando..." : "Ingresar"}
    </button>
  );
}

export default function LoginForm() {
  const [state, action] = useActionState(login, initialState);

  return (
    <Form action={action} className="w-full flex flex-col gap-5">
      <label className="flex flex-col gap-2">
        <span className="text-lg text-ink-soft">Usuario</span>
        <input
          name="username"
          autoComplete="username"
          required
          className="rounded-xl border border-ink/15 bg-cream-dark/30 px-5 py-3 text-xl text-ink outline-none focus:border-amber"
        />
      </label>

      <label className="flex flex-col gap-2">
        <span className="text-lg text-ink-soft">Contraseña</span>
        <input
          type="password"
          name="password"
          autoComplete="current-password"
          required
          className="rounded-xl border border-ink/15 bg-cream-dark/30 px-5 py-3 text-xl text-ink outline-none focus:border-amber"
        />
      </label>

      {state.error && (
        <p className="text-lg text-rust-dark">{state.error}</p>
      )}

      <SubmitButton />
    </Form>
  );
}
