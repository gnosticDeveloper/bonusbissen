"use client";

import Link from "next/link";
import { ReactNode, SubmitEvent, useEffect, useId, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, LockKeyhole, LogOut, Monitor, Smartphone } from "lucide-react";
import {
  deleteAccount,
  DeviceSession,
  getDeviceSessions,
  resendVerificationEmail,
  revokeDeviceSession,
  revokeOtherDeviceSessions,
  updateProfile,
  uploadAvatar,
} from "./actions";
import { ChangePasswordForm } from "./change-password-form";
import { useUser } from "@/providers/user-provider";
import { useModal } from "@/components/modal";
import { CitySelect } from "@/components/city-select";
import { ImageUploadField } from "@/components/image-upload-field";
import { formatDate } from "@/lib/helpers/format";
import { timeAgo } from "@/lib/helpers/dashboard";
import { useCurrentTime } from "@/hooks/use-current-time";

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

/** Current device first, then most recently used. */
function sortSessions(sessions: DeviceSession[]): DeviceSession[] {
  return sessions.toSorted((a, b) => Number(b.current) - Number(a.current) || Date.parse(b.lastUsedAt) - Date.parse(a.lastUsedAt));
}

/** The backend labels sessions "<navegador> en <sistema>"; phones and tablets get the phone icon. */
function isMobileDevice(device: string): boolean {
  return /\b(Android|iOS)$/.test(device);
}

const OUTLINE_BUTTON =
  "h-10 shrink-0 rounded-xl border border-border bg-transparent px-3.5 text-sm font-semibold text-foreground transition-colors hover:bg-foreground/5 disabled:opacity-50";

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
  const dialogRef = useRef<HTMLDialogElement>(null);
  const pointerDownOnBackdrop = useRef(false);
  const titleId = useId();
  const descriptionId = useId();

  // The `open` prop is the source of truth; showModal() provides the top layer, focus containment and Escape handling.
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    else if (!open && dialog.open) dialog.close();
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  function requestClose() {
    if (!loading) onOpenChange(false);
  }

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={titleId}
      aria-describedby={descriptionId}
      onCancel={(event) => {
        event.preventDefault();
        requestClose();
      }}
      onClose={() => {
        // The browser may force-close the dialog (e.g. a repeated Escape); keep the parent state in sync.
        if (open) onOpenChange(false);
      }}
      onPointerDown={(event) => {
        pointerDownOnBackdrop.current = event.target === event.currentTarget;
      }}
      onClick={(event) => {
        // The dialog has no padding, so a click whose target is the dialog itself landed on the backdrop.
        if (pointerDownOnBackdrop.current && event.target === event.currentTarget) requestClose();
        pointerDownOnBackdrop.current = false;
      }}
      className="m-auto w-[calc(100%-2rem)] max-w-sm rounded-2xl border border-border bg-card p-0 text-foreground shadow-xl backdrop:bg-black/40"
    >
      <div className="p-5">
        <h2 id={titleId} className="text-base font-medium text-foreground">{title}</h2>
        <p id={descriptionId} className="mt-2 text-sm leading-5 text-foreground/75">{description}</p>

        {error && <p className="mt-3 rounded-lg bg-red-600 px-3 py-2 text-sm text-white">{error}</p>}

        <div className="mt-5 flex justify-end gap-3">
          <button
            type="button"
            onClick={requestClose}
            disabled={loading}
            className="rounded-full px-4 py-2 text-sm font-medium text-foreground transition-opacity disabled:opacity-60"
          >
            Cancelar
          </button>
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
      </div>
    </dialog>
  );
}

export default function ProfilePage() {
  const router = useRouter();
  const user = useUser();
  const modal = useModal();
  const now = useCurrentTime();

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

  const [passwordSaved, setPasswordSaved] = useState(false);

  const [verifyState, setVerifyState] = useState<VerifyState>("idle");
  const [sessions, setSessions] = useState<DeviceSession[]>([]);
  const [sessionsState, setSessionsState] = useState<SessionsState>("loading");
  const [sessionsError, setSessionsError] = useState<string | null>(null);
  const [sessionToRevoke, setSessionToRevoke] = useState<DeviceSession | null>(null);
  const [sessionRevokeState, setSessionRevokeState] = useState<SaveState>("idle");
  const [sessionRevokeError, setSessionRevokeError] = useState<string | null>(null);
  const [revokeOthersOpen, setRevokeOthersOpen] = useState(false);
  const [revokeOthersState, setRevokeOthersState] = useState<SaveState>("idle");
  const [revokeOthersError, setRevokeOthersError] = useState<string | null>(null);

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteState, setDeleteState] = useState<DeleteState>("idle");

  const hasProfileChanges = name.trim() !== current.name || email.trim() !== current.email;
  const emailChanged = email.trim() !== current.email;
  const otherSessionsCount = sessions.filter((session) => !session.current).length;

  useEffect(() => {
    let active = true;

    async function loadSessions() {
      const result = await getDeviceSessions();
      if (!active) return;
      if (result.ok) {
        setSessions(sortSessions(result.data));
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

  function openPasswordModal() {
    setPasswordSaved(false);
    modal.open(
      <ChangePasswordForm
        onCancel={modal.close}
        onSaved={() => {
          modal.close();
          setPasswordSaved(true);
        }}
      />,
      {
        title: "Cambiar contraseña",
        description: "La próxima vez que inicies sesión vas a tener que usar la contraseña nueva.",
      },
    );
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

  async function handleRevokeOtherSessions() {
    if (revokeOthersState === "saving") return;
    setRevokeOthersState("saving");
    setRevokeOthersError(null);

    const result = await revokeOtherDeviceSessions();
    // Re-read either way: on a partial failure some sessions are already gone.
    const refreshed = await getDeviceSessions();
    if (refreshed.ok) setSessions(sortSessions(refreshed.data));

    if (!result.ok) {
      setRevokeOthersState("error");
      setRevokeOthersError(result.error);
      return;
    }
    setRevokeOthersOpen(false);
    setRevokeOthersState("idle");
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
        <div className="mb-5 flex flex-col items-center gap-3 border-b border-border pb-5 text-center">
          <ImageUploadField label="Foto de perfil" shape="avatar" hideLabel initialUrl={user?.avatarUrl} upload={uploadAvatar} />
          <div className="min-w-0 max-w-full">
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

      <section className="mb-6 rounded-2xl border border-border bg-card p-5">
        <h2 className="mb-1 text-sm font-medium text-foreground">Ciudad preferida</h2>
        <p className="mb-4 text-sm text-foreground/75">
          Elegí dónde querés descubrir negocios. La selección se guarda solo en este dispositivo y se aplica automáticamente al explorar.
        </p>
        <CitySelect />
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

      <section aria-labelledby="perfil-password" className="mb-7 flex items-center gap-3.5 rounded-[20px] border border-border bg-card p-4">
        <span aria-hidden="true" className="grid size-10 shrink-0 place-items-center rounded-xl bg-foreground/5 text-foreground/80">
          <LockKeyhole className="size-5" />
        </span>
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <h2 id="perfil-password" className="text-base font-bold text-foreground">Contraseña</h2>
          <p role="status" className="text-sm text-foreground/75">
            {passwordSaved ? "Tu contraseña se actualizó correctamente." : "Cambiala si creés que alguien más la conoce."}
          </p>
        </div>
        <button type="button" onClick={openPasswordModal} className={OUTLINE_BUTTON}>
          Cambiar
        </button>
      </section>

      <section aria-labelledby="perfil-sessions" className="mb-7 flex flex-col gap-3">
        <div className="flex flex-col gap-1 px-1">
          <h2 id="perfil-sessions" className="text-lg font-bold text-foreground">Dispositivos conectados</h2>
          <p className="text-sm leading-normal text-foreground/75">Si no reconocés alguno, cerrá esa sesión y cambiá tu contraseña.</p>
        </div>

        {sessionsState === "loading" && (
          <div className="flex items-center gap-2 px-1 py-3 text-sm text-foreground/75">
            <span className="size-4 animate-spin rounded-full border-2 border-muted border-t-transparent" />
            Cargando sesiones...
          </div>
        )}
        {sessionsState === "error" && <p className="rounded-lg bg-red-600 px-3 py-2 text-sm text-white">{sessionsError}</p>}
        {sessionsState === "ready" && sessions.length === 0 && <p className="px-1 text-sm text-foreground/75">No encontramos sesiones activas.</p>}

        {sessions.length > 0 && (
          <ul className="divide-y divide-border overflow-hidden rounded-[20px] border border-border bg-card">
            {sessions.map((session) => {
              const DeviceIcon = isMobileDevice(session.device) ? Smartphone : Monitor;
              const lastUsed = now === null ? null : timeAgo(session.lastUsedAt, now);
              return (
                <li key={session.id} className="flex items-center gap-3.5 p-4">
                  <span aria-hidden="true" className="grid size-11 shrink-0 place-items-center rounded-[13px] bg-foreground/5 text-foreground/80">
                    <DeviceIcon className="size-5.5" />
                  </span>
                  <div className="flex min-w-0 flex-1 flex-col gap-0.75">
                    <p className="truncate text-[15px] font-bold text-foreground">{session.device}</p>
                    {session.current ? (
                      <p className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-brand-ink">
                        <span aria-hidden="true" className="size-1.75 rounded-full bg-current" />
                        Este dispositivo · activo ahora
                      </p>
                    ) : (
                      <p className="text-[13px] text-foreground/75">Último uso: {lastUsed ?? formatDate(session.lastUsedAt)}</p>
                    )}
                    <p className="text-xs text-foreground/75">Iniciada el {formatDate(session.createdAt)}</p>
                  </div>
                  {!session.current && (
                    <button
                      type="button"
                      onClick={() => {
                        setSessionRevokeState("idle");
                        setSessionRevokeError(null);
                        setSessionToRevoke(session);
                      }}
                      aria-label={`Cerrar sesión en ${session.device}`}
                      className={OUTLINE_BUTTON}
                    >
                      Cerrar
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        )}

        {sessionsState === "ready" && sessions.length > 0 && otherSessionsCount === 0 && (
          <p className="px-1 text-[13px] text-foreground/75">Tu cuenta solo está abierta en este dispositivo.</p>
        )}
        {otherSessionsCount > 0 && (
          <button
            type="button"
            onClick={() => {
              setRevokeOthersState("idle");
              setRevokeOthersError(null);
              setRevokeOthersOpen(true);
            }}
            className="flex h-12 items-center justify-center gap-2 rounded-[14px] border border-border bg-transparent text-[15px] font-bold text-red-700 transition-colors hover:bg-red-500/10 dark:text-red-300"
          >
            <LogOut className="size-4.5" aria-hidden="true" />
            {otherSessionsCount === 1 ? "Cerrar la otra sesión" : `Cerrar las otras ${otherSessionsCount} sesiones`}
          </button>
        )}
      </section>

      <section aria-labelledby="perfil-delete" className="mb-8 flex flex-col gap-3.5 rounded-[20px] border border-red-500/30 bg-red-500/5 p-4.5">
        <div className="flex flex-col gap-1.5">
          <h2 id="perfil-delete" className="text-base font-bold text-foreground">Eliminar cuenta</h2>
          <p className="text-sm leading-normal text-foreground/80">Perdés los puntos de todas las tiendas y tu historial de canjes. No se puede deshacer.</p>
        </div>
        <button
          type="button"
          onClick={() => {
            setDeleteState("idle");
            setDeleteOpen(true);
          }}
          className="h-11 self-start rounded-xl border border-red-500/50 bg-transparent px-4 text-[15px] font-bold text-red-700 transition-colors hover:bg-red-500/10 dark:text-red-300"
        >
          Eliminar mi cuenta
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
        open={revokeOthersOpen}
        onOpenChange={setRevokeOthersOpen}
        title={otherSessionsCount === 1 ? "¿Cerrar la otra sesión?" : "¿Cerrar las otras sesiones?"}
        description="Tu cuenta va a dejar de estar abierta en los demás dispositivos. Este dispositivo sigue conectado."
        confirmLabel="Cerrar sesiones"
        loadingLabel="Cerrando..."
        loading={revokeOthersState === "saving"}
        error={revokeOthersError}
        destructive
        onConfirm={() => void handleRevokeOtherSessions()}
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
