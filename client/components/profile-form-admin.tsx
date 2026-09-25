"use client";

import { SubmitEvent, useState } from "react";
import { AdminUserInfo } from "@/lib/definitions";
import { updatePassword, updateProfile } from "@/app/d/[slug]/perfil/actions";
import { AlertCircle } from "lucide-react";

type SaveState = "idle" | "saving" | "saved" | "error";

export function ProfileForm({ user }: { user: AdminUserInfo }) {
  const [current, setCurrent] = useState(user);
  const [name, setName] = useState(user.name);
  const [email, setEmail] = useState(user.email);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [saveError, setSaveError] = useState<string | null>(null);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordState, setPasswordState] = useState<SaveState>("idle");
  const [passwordError, setPasswordError] = useState<string | null>(null);

  const hasProfileChanges = name !== current.name || email !== current.email;

  async function handleSaveProfile(e: SubmitEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!hasProfileChanges || saveState === "saving") return;

    setSaveState("saving");
    setSaveError(null);

    const result = await updateProfile({ name, email });

    if (result.ok) {
      setCurrent(result.data);
      setName(result.data.name);
      setEmail(result.data.email);
      setSaveState("saved");
    } else {
      setSaveState("error");
      setSaveError(result.error);
    }
  }

  async function handleChangePassword(e: SubmitEvent<HTMLFormElement>) {
    e.preventDefault();
    if (passwordState === "saving") return;

    if (newPassword !== confirmPassword) {
      setPasswordState("error");
      setPasswordError("Las contraseñas nuevas no coinciden.");
      return;
    }

    setPasswordState("saving");
    setPasswordError(null);

    const result = await updatePassword({ currentPassword, newPassword });

    if (result.ok) {
      setPasswordState("saved");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } else {
      setPasswordState("error");
      setPasswordError(result.error);
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col px-4 pt-6">
      <h1 className="mb-6 text-xl font-medium text-foreground">Mi perfil</h1>

      {/* Datos básicos */}
      <section className="mb-6 rounded-2xl border border-border bg-card p-5">
        <div className="mb-5 flex items-center gap-4">
          <div className="flex size-14 shrink-0 items-center justify-center rounded-full bg-primary text-lg font-medium text-primary-foreground">
            {current.name ? current.name.charAt(0).toUpperCase() : "?"}
          </div>
          <div className="min-w-0">
            <p className="truncate text-base font-medium text-foreground">{current.name}</p>
            <p className="truncate text-sm text-muted">@{current.username}</p>
          </div>
        </div>

        <form onSubmit={handleSaveProfile} className="flex flex-col gap-4">
          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-foreground">Nombre</span>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="rounded-xl border border-border bg-background px-3.5 py-2.5 text-sm text-foreground outline-none transition-colors focus:border-primary"
            />
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-foreground">Email</span>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="rounded-xl border border-border bg-background px-3.5 py-2.5 text-sm text-foreground outline-none transition-colors focus:border-primary"
            />
            {email !== current.email && (
              <span className="text-xs text-muted flex items-center gap-x-1">
                <AlertCircle size={12} /> Si cambias tu email, vas a tener que volver a verificarte.
              </span>
            )}
          </label>

          <div className="flex items-center gap-2 border-t border-border pt-4">
            <span className={`size-2 rounded-full ${current.emailVerified ? "bg-primary" : "bg-muted"}`} aria-hidden="true" />
            <span className="text-sm text-foreground">{current.emailVerified ? "Email verificado" : "Email sin verificar"}</span>
          </div>

          {saveState === "error" && saveError && <p className="text-sm text-red-600 dark:text-red-400">{saveError}</p>}
          {saveState === "saved" && <p className="text-sm text-foreground">Tus datos se actualizaron correctamente.</p>}

          <button
            type="submit"
            disabled={!hasProfileChanges || saveState === "saving"}
            className="inline-flex w-fit items-center gap-2 self-end rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-opacity disabled:opacity-60"
          >
            {saveState === "saving" && (
              <span className="size-3.5 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />
            )}
            {saveState === "saving" ? "Guardando..." : "Guardar cambios"}
          </button>
        </form>
      </section>

      {/* Cambiar contraseña */}
      <section className="mb-6 rounded-2xl border border-border bg-card p-5">
        <p className="mb-4 text-sm font-medium text-foreground">Cambiar contraseña</p>
        <div className="mb-4 text-sm flex items-center gap-x-2 font-medium text-muted">
          <AlertCircle size={24} />
          <p>
            La contraseña debe tener entre 8 y 72 caracteres e incluir, al menos, una mayúscula, una minúscula, un número y un caracter especial.
          </p>
        </div>

        <form onSubmit={handleChangePassword} className="flex flex-col gap-4">
          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-foreground">Contraseña actual</span>
            <input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              required
              autoComplete="current-password"
              className="rounded-xl border border-border bg-background px-3.5 py-2.5 text-sm text-foreground outline-none transition-colors focus:border-primary"
            />
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-foreground">Nueva contraseña</span>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
              autoComplete="new-password"
              className="rounded-xl border border-border bg-background px-3.5 py-2.5 text-sm text-foreground outline-none transition-colors focus:border-primary"
            />
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-foreground">Confirmar nueva contraseña</span>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              autoComplete="new-password"
              className="rounded-xl border border-border bg-background px-3.5 py-2.5 text-sm text-foreground outline-none transition-colors focus:border-primary"
            />
          </label>

          {passwordState === "error" && passwordError && <p className="text-sm text-red-600 dark:text-red-400">{passwordError}</p>}
          {passwordState === "saved" && <p className="text-sm text-foreground">Tu contraseña se actualizó correctamente.</p>}

          <button
            type="submit"
            disabled={passwordState === "saving" || !currentPassword || !newPassword || !confirmPassword}
            className="inline-flex w-fit items-center gap-2 self-end rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-opacity disabled:opacity-60"
          >
            {passwordState === "saving" && (
              <span className="size-3.5 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />
            )}
            {passwordState === "saving" ? "Guardando..." : "Cambiar contraseña"}
          </button>
        </form>
      </section>
    </div>
  );
}
