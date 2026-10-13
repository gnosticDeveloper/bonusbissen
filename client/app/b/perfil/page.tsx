"use client";

import Link from "next/link";
import { ReactNode, SubmitEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Dialog } from "@base-ui/react/dialog";
import { AlertCircle, MonitorSmartphone, ShieldCheck } from "lucide-react";
import {
  deleteAccount,
  DeviceSession,
  getDeviceSessions,
  resendVerificationEmail,
  revokeAllDeviceSessions,
  revokeDeviceSession,
  updatePassword,
  updateProfile,
} from "./actions";
import { useUser } from "@/providers/user-provider";

type SaveState = "idle" | "saving" | "saved" | "error";
type VerifyState = "idle" | "sending" | "sent" | "error";
type DeleteState = "idle" | "deleting" | "error";
type SessionsState = "loading" | "ready" | "error";

type ConfirmDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: ReactNode;
  confirmLabel: string;
  loadingLabel: string;
  loading: boolean;
  error?: string | null;
  destructive?: boolean;
  onConfirm: () => void;
};

const PASSWORD_PATTERN = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,72}$/;
const dateFormatter = new Intl.DateTimeFormat("es-AR", {
  dateStyle: "medium",
  timeStyle: "short",
});

function Spinner({ dark = false }: { dark?: boolean }) {
  return <span className={`size-3.5 animate-spin rounded-full border-2 ${dark ? "border-white" : "border-primary-foreground"} border-t-transparent`} />;
}

function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel,
  loadingLabel,
  loading,
  error,
  destructive = false,
  onConfirm,
}: ConfirmDialogProps) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-40 bg-black/40" />
        <Dialog.Popup className="fixed left-1/2 top-1/2 z-50 w-[calc(100%-2rem)] max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-border bg-card p-5 shadow-xl">
          <Dialog.Title className="text-base font-medium text-foreground">{title}</Dialog.Title>
          <Dialog.Description className="mt-2 text-sm leading-5 text-foreground/75">{description}</Dialog.Description>

          {error && <p className="mt-3 rounded-lg bg-red-600 px-3 py-2 text-sm text-white">{error}</p>}

          <div className="mt-5 flex justify-end gap-3">
            <Dialog.Close
              disabled={loading}
              className="rounded-full px-4 py-2 text-sm font-medium text-foreground transition-opacity disabled:opacity-60"
            >
              Cancelar
            </Dialog.Close>
            <button
              type="button"
              onClick={onConfirm}
              disabled={loading}
              className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-opacity disabled:opacity-60 ${
                destructive ? "bg-red-600 text-white" : "bg-primary text-primary-foreground"
              }`}
            >
              {loading && <Spinner dark={destructive} />}
              {loading ? loadingLabel : confirmLabel}
            </button>
          </div>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function formatDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Fecha desconocida" : dateFormatter.format(date);
}

export default function ProfilePage() {
  const router = useRouter();
  const user = useUser();

  const [current, setCurrent] = useState({
    name: user?.name ?? "",
    username: user?.username ?? "",
    email: user?.email ?? "",
    emailVerified: user?.emailVerified ?? false,
  });
  const [name, setName] = useState(current.name);
  const [email, setEmail] = useState(current.email);
  const [profileState, setProfileState] = useState<SaveState>("idle");
  const [profileError, setProfileError] = useState<string | null>(null);
  const [profileConfirmOpen, setProfileConfirmOpen] = useState(false);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordState, setPasswordState] = useState<SaveState>("idle");
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordConfirmOpen, setPasswordConfirmOpen] = useState(false);

  const [verifyState, setVerifyState] = useState<VerifyState>("idle");
  const [sessions, setSessions] = useState<DeviceSession[]>([]);
  const [sessionsState, setSessionsState] = useState<SessionsState>("loading");
  const [sessionsError, setSessionsError] = useState<string | null>(null);
  const [sessionToRevoke, setSessionToRevoke] = useState<DeviceSession | null>(null);
  const [sessionRevokeState, setSessionRevokeState] = useState<SaveState>("idle");
  const [sessionRevokeError, setSessionRevokeError] = useState<string | null>(null);
  const [revokeAllOpen, setRevokeAllOpen] = useState(false);
  const [revokeAllState, setRevokeAllState] = useState<SaveState>("idle");
  const [revokeAllError, setRevokeAllError] = useState<string | null>(null);

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteState, setDeleteState] = useState<DeleteState>("idle");

  const hasProfileChanges = name.trim() !== current.name || email.trim() !== current.email;
  const emailChanged = email.trim() !== current.email;

  useEffect(() => {
    let active = true;

    async function loadSessions() {
      const result = await getDeviceSessions();
      if (!active) return;
      if (result.ok) {
        setSessions(
          result.data.toSorted((a, b) => Number(b.current) - Number(a.current) || Date.parse(b.lastUsedAt) - Date.parse(a.lastUsedAt)),
        );
        setSessionsState("ready");
      } else {
        setSessionsError(result.error);
        setSessionsState("error");
      }
    }

    void loadSessions();
    return () => {
      active = false;
    };
  }, []);

  async function saveProfile() {
    if (!hasProfileChanges || profileState === "saving") return;
    setProfileState("saving");
    setProfileError(null);

    const result = await updateProfile({ name, email });
    if (!result.ok) {
      setProfileState("error");
      setProfileError(result.error);
      return;
    }

    const updated = {
      name: result.data.name,
      username: result.data.username,
      email: result.data.email ?? "",
      emailVerified: result.data.emailVerified,
    };
    setCurrent(updated);
    setName(updated.name);
    setEmail(updated.email);
    setProfileState("saved");
    setProfileConfirmOpen(false);
    setVerifyState("idle");
    router.refresh();
  }

  function handleProfileSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!name.trim()) {
      setProfileState("error");
      setProfileError("Ingresá tu nombre.");
      return;
    }
    if (emailChanged) {
      setProfileConfirmOpen(true);
      return;
    }
    void saveProfile();
  }

  function handlePasswordSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    setPasswordError(null);

    if (newPassword !== confirmPassword) {
      setPasswordState("error");
      setPasswordError("Las contraseñas nuevas no coinciden.");
      return;
    }
    if (!PASSWORD_PATTERN.test(newPassword)) {
      setPasswordState("error");
      setPasswordError("La contraseña nueva no cumple con los requisitos de seguridad.");
      return;
    }
    setPasswordConfirmOpen(true);
  }

  async function savePassword() {
    if (passwordState === "saving") return;
    setPasswordState("saving");
    setPasswordError(null);

    const result = await updatePassword({ currentPassword, newPassword });
    if (!result.ok) {
      setPasswordState("error");
      setPasswordError(result.error);
      return;
    }

    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setPasswordState("saved");
    setPasswordConfirmOpen(false);
  }

  async function handleVerifyEmail() {
    if (verifyState === "sending" || verifyState === "sent") return;
    setVerifyState("sending");
    const result = await resendVerificationEmail();
    setVerifyState(result.ok ? "sent" : "error");
  }

  async function handleRevokeSession() {
    if (!sessionToRevoke || sessionRevokeState === "saving") return;
    setSessionRevokeState("saving");
    setSessionRevokeError(null);

    const result = await revokeDeviceSession(sessionToRevoke.id, sessionToRevoke.current);
    if (!result.ok) {
      setSessionRevokeState("error");
      setSessionRevokeError(result.error);
      return;
    }
    if (sessionToRevoke.current) {
      router.replace("/sign-in");
      router.refresh();
      return;
    }

    setSessions((items) => items.filter((session) => session.id !== sessionToRevoke.id));
    setSessionToRevoke(null);
    setSessionRevokeState("idle");
  }

  async function handleRevokeAllSessions() {
    if (revokeAllState === "saving") return;
    setRevokeAllState("saving");
    setRevokeAllError(null);

    const result = await revokeAllDeviceSessions();
    if (!result.ok) {
      setRevokeAllState("error");
      setRevokeAllError(result.error);
      return;
    }
    router.replace("/sign-in");
    router.refresh();
  }

  async function handleDeleteAccount() {
    setDeleteState("deleting");
    const result = await deleteAccount();
    if (result.ok) {
      router.replace("/sign-in");
      router.refresh();
      return;
    }
    setDeleteState("error");
  }

  return (
    <div className="mx-auto flex w-full max-w-107.5 flex-col px-4 pt-6">
      <Link href="/b" className="mb-6 inline-flex w-fit items-center gap-1.5 text-sm text-foreground/75 transition-colors hover:text-foreground">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="shrink-0" aria-hidden="true">
          <path d="M10 12.5L5.5 8L10 3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        Volver
      </Link>

      <h1 className="mb-6 text-xl font-medium text-foreground">Mi perfil</h1>

      <section className="mb-6 rounded-2xl border border-border bg-card p-5">
        <div className="mb-5 flex items-center gap-4">
          <div className="flex size-14 shrink-0 items-center justify-center rounded-full bg-primary text-lg font-medium text-primary-foreground">
            {current.name ? current.name.charAt(0).toUpperCase() : "?"}
          </div>
          <div className="min-w-0">
            <p className="truncate text-base font-medium text-foreground">{current.name || "Sin nombre"}</p>
            <p className="truncate text-sm text-foreground/75">@{current.username}</p>
          </div>
        </div>

        <form onSubmit={handleProfileSubmit} className="flex flex-col gap-4">
          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-foreground">Nombre de usuario</span>
            <input
              type="text"
              value={current.username}
              readOnly
              aria-readonly="true"
              className="cursor-not-allowed rounded-xl border border-border bg-muted/10 px-3.5 py-2.5 text-sm text-foreground/75 outline-none"
            />
            <span className="text-xs text-foreground/75">El nombre de usuario no se puede modificar.</span>
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-foreground">Nombre</span>
            <input
              type="text"
              value={name}
              onChange={(event) => {
                setName(event.target.value);
                setProfileState("idle");
              }}
              required
              maxLength={255}
              autoComplete="name"
              className="rounded-xl border border-border bg-background px-3.5 py-2.5 text-sm text-foreground outline-none transition-colors focus:border-primary"
            />
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-foreground">Email</span>
            <input
              type="email"
              value={email}
              onChange={(event) => {
                setEmail(event.target.value);
                setProfileState("idle");
              }}
              maxLength={255}
              autoComplete="email"
              placeholder="tu@email.com"
              className="rounded-xl border border-border bg-background px-3.5 py-2.5 text-sm text-foreground outline-none transition-colors focus:border-primary"
            />
            {emailChanged && (
              <span className="flex items-center gap-1 text-xs text-foreground/75">
                <AlertCircle className="size-3.5 shrink-0" aria-hidden="true" />
                {email.trim() ? "Si cambiás tu email, vas a tener que verificarlo nuevamente." : "Vas a eliminar el email asociado a tu cuenta."}
              </span>
            )}
          </label>

          {current.email && (
            <div className="flex items-center gap-2 border-t border-border pt-4">
              <span className={`size-2 rounded-full ${current.emailVerified ? "bg-primary" : "bg-muted"}`} aria-hidden="true" />
              <span className="text-sm text-foreground">{current.emailVerified ? "Email verificado" : "Email sin verificar"}</span>
            </div>
          )}

          {profileState === "error" && profileError && <p className="rounded-lg bg-red-600 px-3 py-2 text-sm text-white">{profileError}</p>}
          {profileState === "saved" && <p className="text-sm text-foreground">Tus datos se actualizaron correctamente.</p>}

          <button
            type="submit"
            disabled={!hasProfileChanges || profileState === "saving"}
            className="inline-flex w-fit items-center gap-2 self-end rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-opacity disabled:opacity-60"
          >
            {profileState === "saving" && <Spinner />}
            {profileState === "saving" ? "Guardando..." : "Guardar cambios"}
          </button>
        </form>
      </section>

      {!current.emailVerified && current.email && (
        <section className="mb-6 rounded-2xl border border-border bg-card p-5">
          <p className="mb-1 text-sm font-medium text-foreground">Verificá tu email</p>
          <p className="mb-4 text-sm text-foreground/75">Vas a poder recuperar tu cuenta y recibir novedades importantes sobre tus puntos y recompensas.</p>

          {verifyState === "sent" ? (
            <p className="text-sm text-foreground">Te enviamos un email de verificación a {current.email}. Revisá tu bandeja de entrada.</p>
          ) : (
            <button
              type="button"
              onClick={handleVerifyEmail}
              disabled={verifyState === "sending"}
              className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-opacity disabled:opacity-60"
            >
              {verifyState === "sending" && <Spinner />}
              {verifyState === "sending" ? "Enviando..." : "Enviar correo de verificación"}
            </button>
          )}

          {verifyState === "error" && <p className="mt-2 rounded-lg bg-red-600 px-3 py-2 text-sm text-white">No pudimos enviar el email. Probá de nuevo en unos minutos.</p>}
        </section>
      )}

      <section className="mb-6 rounded-2xl border border-border bg-card p-5">
        <div className="mb-4 flex items-center gap-2">
          <ShieldCheck className="size-5 text-foreground" aria-hidden="true" />
          <p className="text-sm font-medium text-foreground">Cambiar contraseña</p>
        </div>
        <div className="mb-4 flex items-start gap-2 text-sm text-foreground/75">
          <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          <p>Debe tener entre 8 y 72 caracteres e incluir una mayúscula, una minúscula, un número y un caracter especial.</p>
        </div>

        <form onSubmit={handlePasswordSubmit} className="flex flex-col gap-4">
          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-foreground">Contraseña actual</span>
            <input
              type="password"
              value={currentPassword}
              onChange={(event) => {
                setCurrentPassword(event.target.value);
                setPasswordState("idle");
              }}
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
              onChange={(event) => {
                setNewPassword(event.target.value);
                setPasswordState("idle");
              }}
              required
              minLength={8}
              maxLength={72}
              autoComplete="new-password"
              className="rounded-xl border border-border bg-background px-3.5 py-2.5 text-sm text-foreground outline-none transition-colors focus:border-primary"
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-foreground">Confirmar nueva contraseña</span>
            <input
              type="password"
              value={confirmPassword}
              onChange={(event) => {
                setConfirmPassword(event.target.value);
                setPasswordState("idle");
              }}
              required
              minLength={8}
              maxLength={72}
              autoComplete="new-password"
              className="rounded-xl border border-border bg-background px-3.5 py-2.5 text-sm text-foreground outline-none transition-colors focus:border-primary"
            />
          </label>

          {passwordState === "error" && passwordError && <p className="rounded-lg bg-red-600 px-3 py-2 text-sm text-white">{passwordError}</p>}
          {passwordState === "saved" && <p className="text-sm text-foreground">Tu contraseña se actualizó correctamente.</p>}

          <button
            type="submit"
            disabled={passwordState === "saving" || !currentPassword || !newPassword || !confirmPassword}
            className="inline-flex w-fit items-center gap-2 self-end rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-opacity disabled:opacity-60"
          >
            Cambiar contraseña
          </button>
        </form>
      </section>

      <section className="mb-6 rounded-2xl border border-border bg-card p-5">
        <div className="mb-1 flex items-center gap-2">
          <MonitorSmartphone className="size-5 text-foreground" aria-hidden="true" />
          <h2 className="text-sm font-medium text-foreground">Sesiones activas</h2>
        </div>
        <p className="mb-4 text-sm text-foreground/75">Revisá los dispositivos donde tu cuenta está abierta y cerrá cualquier sesión que no reconozcas.</p>

        {sessionsState === "loading" && (
          <div className="flex items-center gap-2 py-3 text-sm text-foreground/75">
            <span className="size-4 animate-spin rounded-full border-2 border-muted border-t-transparent" />
            Cargando sesiones...
          </div>
        )}
        {sessionsState === "error" && <p className="rounded-lg bg-red-600 px-3 py-2 text-sm text-white">{sessionsError}</p>}
        {sessionsState === "ready" && sessions.length === 0 && <p className="text-sm text-foreground/75">No encontramos sesiones activas.</p>}

        {sessions.length > 0 && (
          <div className="divide-y divide-border border-y border-border">
            {sessions.map((session) => (
              <div key={session.id} className="flex items-start justify-between gap-3 py-4">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="truncate text-sm font-medium text-foreground">{session.device}</p>
                    {session.current && <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-foreground">Este dispositivo</span>}
                  </div>
                  <p className="mt-1 text-xs text-foreground/75">Último uso: {formatDate(session.lastUsedAt)}</p>
                  <p className="mt-0.5 text-xs text-foreground/75">Iniciada: {formatDate(session.createdAt)}</p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setSessionRevokeState("idle");
                    setSessionRevokeError(null);
                    setSessionToRevoke(session);
                  }}
                  className="shrink-0 rounded-lg bg-red-600 px-3 py-2 text-sm font-medium text-white transition-opacity hover:bg-red-700"
                >
                  Cerrar
                </button>
              </div>
            ))}
          </div>
        )}

        <button
          type="button"
          onClick={() => {
            setRevokeAllState("idle");
            setRevokeAllError(null);
            setRevokeAllOpen(true);
          }}
          disabled={sessionsState !== "ready" || sessions.length === 0}
          className="mt-4 rounded-lg bg-red-600 px-3 py-2 text-sm font-medium text-white transition-opacity hover:bg-red-700 disabled:opacity-50"
        >
          Cerrar sesión en todos los dispositivos
        </button>
      </section>

      <section className="mt-2 border-t border-border pb-8 pt-6">
        <p className="mb-1 text-sm font-medium text-foreground">Zona de peligro</p>
        <p className="mb-4 text-sm text-foreground/75">La eliminación de tu cuenta es permanente y no se puede deshacer.</p>
        <button
          type="button"
          onClick={() => {
            setDeleteState("idle");
            setDeleteOpen(true);
          }}
          className="rounded-lg bg-red-600 px-3 py-2 text-sm font-medium text-white transition-opacity hover:bg-red-700"
        >
          Eliminar cuenta
        </button>
      </section>

      <ConfirmDialog
        open={profileConfirmOpen}
        onOpenChange={setProfileConfirmOpen}
        title={email.trim() ? "¿Cambiar tu email?" : "¿Eliminar tu email?"}
        description={
          email.trim()
            ? "Tu email actual dejará de estar verificado. Te enviaremos un enlace a la nueva dirección para que vuelvas a verificarla."
            : "Ya no vas a poder usar tu email para iniciar sesión ni recibir mensajes de recuperación hasta que agregues uno nuevo."
        }
        confirmLabel="Confirmar cambio"
        loadingLabel="Guardando..."
        loading={profileState === "saving"}
        error={profileState === "error" ? profileError : null}
        onConfirm={() => void saveProfile()}
      />

      <ConfirmDialog
        open={passwordConfirmOpen}
        onOpenChange={setPasswordConfirmOpen}
        title="¿Cambiar tu contraseña?"
        description="La próxima vez que inicies sesión vas a tener que usar la contraseña nueva."
        confirmLabel="Cambiar contraseña"
        loadingLabel="Cambiando..."
        loading={passwordState === "saving"}
        error={passwordState === "error" ? passwordError : null}
        onConfirm={() => void savePassword()}
      />

      <ConfirmDialog
        open={sessionToRevoke !== null}
        onOpenChange={(open) => {
          if (!open) setSessionToRevoke(null);
        }}
        title={sessionToRevoke?.current ? "¿Cerrar esta sesión?" : "¿Revocar esta sesión?"}
        description={
          sessionToRevoke?.current
            ? "Vas a cerrar la sesión de este dispositivo y te redirigiremos para que vuelvas a iniciar sesión."
            : `La cuenta dejará de estar disponible en ${sessionToRevoke?.device ?? "ese dispositivo"}.`
        }
        confirmLabel={sessionToRevoke?.current ? "Cerrar sesión" : "Revocar sesión"}
        loadingLabel="Revocando..."
        loading={sessionRevokeState === "saving"}
        error={sessionRevokeError}
        destructive
        onConfirm={() => void handleRevokeSession()}
      />

      <ConfirmDialog
        open={revokeAllOpen}
        onOpenChange={setRevokeAllOpen}
        title="¿Cerrar todas las sesiones?"
        description="Se cerrará tu cuenta en todos los dispositivos, incluido este. Vas a tener que volver a iniciar sesión."
        confirmLabel="Cerrar todas"
        loadingLabel="Cerrando..."
        loading={revokeAllState === "saving"}
        error={revokeAllError}
        destructive
        onConfirm={() => void handleRevokeAllSessions()}
      />

      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="¿Eliminar tu cuenta?"
        description="Esta acción es permanente. Vas a perder tus puntos, recompensas y afiliaciones a todos los negocios. No se puede deshacer."
        confirmLabel="Eliminar cuenta"
        loadingLabel="Eliminando..."
        loading={deleteState === "deleting"}
        error={deleteState === "error" ? "No pudimos eliminar tu cuenta. Probá de nuevo." : null}
        destructive
        onConfirm={() => void handleDeleteAccount()}
      />
    </div>
  );
}
