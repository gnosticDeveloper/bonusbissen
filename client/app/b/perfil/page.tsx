"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Dialog } from "@base-ui/react/dialog";
import { useUserStore } from "@/lib/user-store";
import { deleteAccount, resendVerificationEmail } from "./actions";

type VerifyState = "idle" | "sending" | "sent" | "error";
type DeleteState = "idle" | "deleting" | "error";

export default function ProfilePage() {
  const router = useRouter();
  const user = useUserStore((state) => state.user);
  const emailVerified = user?.emailVerified ?? false;

  const [verifyState, setVerifyState] = useState<VerifyState>("idle");
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteState, setDeleteState] = useState<DeleteState>("idle");

  async function handleVerifyEmail() {
    if (verifyState === "sending" || verifyState === "sent") return;
    setVerifyState("sending");
    const result = await resendVerificationEmail();
    setVerifyState(result.ok ? "sent" : "error");
  }

  async function handleDeleteAccount() {
    setDeleteState("deleting");
    const result = await deleteAccount();
    if (result.ok) {
      router.replace("/sign-in");
      return;
    }
    setDeleteState("error");
  }

  return (
    <div className="mx-auto flex w-full max-w-107.5 flex-col px-4 pt-6">
      <Link href="/b" className="mb-6 inline-flex w-fit items-center gap-1.5 text-sm text-muted transition-colors hover:text-foreground">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="shrink-0" aria-hidden="true">
          <path d="M10 12.5L5.5 8L10 3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        Volver
      </Link>

      <h1 className="mb-6 text-xl font-medium text-foreground">Mi perfil</h1>

      {/* Información del perfil */}
      <section className="mb-6 rounded-2xl border border-border bg-card p-5">
        <div className="flex items-center gap-4">
          <div className="flex size-14 shrink-0 items-center justify-center rounded-full bg-primary text-lg font-medium text-primary-foreground">
            {user?.name ? user.name.charAt(0).toUpperCase() : "?"}
          </div>
          <div className="min-w-0">
            <p className="truncate text-base font-medium text-foreground">{user?.name ?? "Sin nombre"}</p>
            <p className="truncate text-sm text-muted">{user?.email}</p>
          </div>
        </div>

        <div className="mt-5 flex items-center gap-2 border-t border-border pt-4">
          <span className={`size-2 rounded-full ${emailVerified ? "bg-primary" : "bg-muted"}`} aria-hidden="true" />
          <span className="text-sm text-foreground">{emailVerified ? "Email verificado" : "Email sin verificar"}</span>
        </div>
      </section>

      {/* Verificación de email */}
      {!emailVerified && (
        <section className="mb-6 rounded-2xl border border-border bg-card p-5">
          <p className="mb-1 text-sm font-medium text-foreground">Verificá tu email</p>
          <p className="mb-4 text-sm text-muted">Vas a poder recuperar tu cuenta y recibir novedades importantes sobre tus puntos y recompensas.</p>

          {verifyState === "sent" ? (
            <p className="text-sm text-foreground">Te enviamos un email de verificación. Revisá tu bandeja de entrada.</p>
          ) : (
            <button
              type="button"
              onClick={handleVerifyEmail}
              disabled={verifyState === "sending"}
              className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-opacity disabled:opacity-60"
            >
              {verifyState === "sending" && (
                <span className="size-3.5 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />
              )}
              {verifyState === "sending" ? "Enviando..." : "Verificar email"}
            </button>
          )}

          {verifyState === "error" && (
            <p className="mt-2 text-sm text-red-600 dark:text-red-400">No pudimos enviar el email. Probá de nuevo en unos minutos.</p>
          )}
        </section>
      )}

      {/* Zona de borrado de cuenta */}
      <section className="mt-6 border-t border-border pt-6">
        <Dialog.Root open={deleteOpen} onOpenChange={setDeleteOpen}>
          <Dialog.Trigger className="text-sm font-medium text-red-600 transition-opacity hover:opacity-80 dark:text-red-400">
            Eliminar cuenta
          </Dialog.Trigger>

          <Dialog.Portal>
            <Dialog.Backdrop className="fixed inset-0 bg-black/40" />
            <Dialog.Popup className="fixed left-1/2 top-1/2 w-[calc(100%-2rem)] max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-border bg-card p-5">
              <Dialog.Title className="text-base font-medium text-foreground">¿Eliminar tu cuenta?</Dialog.Title>
              <Dialog.Description className="mt-2 text-sm text-muted">
                Esta acción es permanente. Vas a perder tus puntos, recompensas y afiliaciones a todos los negocios. No se puede deshacer.
              </Dialog.Description>

              {deleteState === "error" && (
                <p className="mt-3 text-sm text-red-600 dark:text-red-400">No pudimos eliminar tu cuenta. Probá de nuevo.</p>
              )}

              <div className="mt-5 flex justify-end gap-3">
                <Dialog.Close
                  disabled={deleteState === "deleting"}
                  className="rounded-full px-4 py-2 text-sm font-medium text-foreground transition-opacity disabled:opacity-60"
                >
                  Cancelar
                </Dialog.Close>
                <button
                  type="button"
                  onClick={handleDeleteAccount}
                  disabled={deleteState === "deleting"}
                  className="inline-flex items-center gap-2 rounded-full bg-red-600 px-4 py-2 text-sm font-medium text-white transition-opacity disabled:opacity-60"
                >
                  {deleteState === "deleting" && <span className="size-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />}
                  {deleteState === "deleting" ? "Eliminando..." : "Eliminar"}
                </button>
              </div>
            </Dialog.Popup>
          </Dialog.Portal>
        </Dialog.Root>
      </section>
    </div>
  );
}
