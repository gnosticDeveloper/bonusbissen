"use client";

import { SubmitEvent, useState } from "react";
import { AlertCircle } from "lucide-react";
import { updatePassword } from "./actions";
import { PASSWORD_PATTERN } from "@/schemas/user";

const INPUT_CLASS =
  "rounded-xl border border-border bg-background px-3.5 py-2.5 text-sm text-foreground outline-none transition-colors focus:border-primary";

/**
 * The password change form shown inside the shared modal. It keeps its own state because the
 * modal renders the element it was opened with and doesn't re-render it from the page.
 */
export function ChangePasswordForm({ onSaved, onCancel }: { onSaved: () => void; onCancel: () => void }) {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving) return;

    if (newPassword !== confirmPassword) {
      setError("Las contraseñas nuevas no coinciden.");
      return;
    }
    if (!PASSWORD_PATTERN.test(newPassword)) {
      setError("La contraseña nueva no cumple con los requisitos de seguridad.");
      return;
    }

    setSaving(true);
    setError(null);
    const result = await updatePassword({ currentPassword, newPassword });
    if (!result.ok) {
      setSaving(false);
      setError(result.error);
      return;
    }
    onSaved();
  }

  function edit(setter: (value: string) => void) {
    return (event: { target: { value: string } }) => {
      setter(event.target.value);
      setError(null);
    };
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="flex items-start gap-2 text-sm text-foreground/75">
        <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
        <p>Debe tener entre 8 y 72 caracteres e incluir una mayúscula, una minúscula, un número y un caracter especial.</p>
      </div>

      <label className="flex flex-col gap-1.5">
        <span className="text-sm font-medium text-foreground">Contraseña actual</span>
        <input
          type="password"
          value={currentPassword}
          onChange={edit(setCurrentPassword)}
          required
          autoComplete="current-password"
          className={INPUT_CLASS}
        />
      </label>
      <label className="flex flex-col gap-1.5">
        <span className="text-sm font-medium text-foreground">Nueva contraseña</span>
        <input
          type="password"
          value={newPassword}
          onChange={edit(setNewPassword)}
          required
          minLength={8}
          maxLength={72}
          autoComplete="new-password"
          className={INPUT_CLASS}
        />
      </label>
      <label className="flex flex-col gap-1.5">
        <span className="text-sm font-medium text-foreground">Confirmar nueva contraseña</span>
        <input
          type="password"
          value={confirmPassword}
          onChange={edit(setConfirmPassword)}
          required
          minLength={8}
          maxLength={72}
          autoComplete="new-password"
          className={INPUT_CLASS}
        />
      </label>

      {error && (
        <p role="alert" className="rounded-lg bg-red-600 px-3 py-2 text-sm text-white">
          {error}
        </p>
      )}

      <div className="flex justify-end gap-3">
        <button
          type="button"
          onClick={onCancel}
          disabled={saving}
          className="h-10 rounded-xl px-4 text-sm font-semibold text-foreground transition-colors hover:bg-foreground/5 disabled:opacity-60"
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={saving || !currentPassword || !newPassword || !confirmPassword}
          className="inline-flex h-10 items-center gap-2 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground transition-opacity disabled:opacity-60"
        >
          {saving && <span className="size-3.5 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />}
          {saving ? "Cambiando..." : "Cambiar contraseña"}
        </button>
      </div>
    </form>
  );
}
