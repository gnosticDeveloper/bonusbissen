"use client";

import { SubmitEvent, Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { requestLoginLink, signIn } from "@/app/(auth)/sign-in/actions";
import { ArrowRight, Eye, EyeOff, LockKeyhole, Mail, UserRound } from "lucide-react";
import Link from "next/link";
import { BrandLockup } from "@/components/brand";
import { Spinner } from "@/components/spinner";
import { buildAuthQueryString, completeAuthRedirect } from "@/lib/helpers/auth-redirect";

export default function SignInPage() {
  return (
    <Suspense fallback={null}>
      <SignInForm />
    </Suspense>
  );
}

function SignInForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [email, setEmail] = useState("");
  const [method, setMethod] = useState<"password" | "email">("password");
  const [linkSent, setLinkSent] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  function chooseMethod(nextMethod: "password" | "email") {
    if (loading) return;
    if (nextMethod === "email" && !email && identifier.includes("@")) setEmail(identifier);
    setMethod(nextMethod);
    setError("");
    setLinkSent(false);
  }

  async function handleSubmit(e: SubmitEvent<HTMLFormElement>) {
    e.preventDefault();
    if (loading) return;

    setLoading(true);
    setError("");

    if (method === "email") {
      try {
        const result = await requestLoginLink(email.trim());
        if (!result.ok) {
          setError(result.error);
          return;
        }
        setLinkSent(true);
      } catch {
        setError("No pudimos enviar el enlace. Intentá de nuevo en un ratito.");
      } finally {
        setLoading(false);
      }
      return;
    }

    const formData = new FormData();
    formData.set("identifier", identifier);
    formData.set("password", password);

    let result;
    try {
      result = await signIn(formData);
    } catch {
      setError("Hubo un problema al iniciar sesión. Intentá de nuevo.");
      setLoading(false);
      return;
    }

    if (!result.ok) {
      setError(result.error);
      setLoading(false);
      return;
    }

    // Fuera del try/catch: puede lanzar un redirect interno.
    await completeAuthRedirect(router, searchParams);
  }

  const authQuery = buildAuthQueryString(searchParams);

  return (
    <main className="mx-auto flex min-h-svh w-full max-w-107.5 flex-col bg-background px-6.5 pt-13.5 pb-8 text-foreground">
      <BrandLockup />

      <h1 className="mt-4.25 mb-3 text-[38px] leading-none text-foreground">
        Volvé a tus
        <br />
        <em className="text-foreground not-italic">lugares favoritos.</em>
      </h1>

      <p className="mb-8.5 max-w-72.5 text-[13px] leading-[1.55] text-foreground/75">Sumá puntos, descubrí recompensas y disfrutá más cada visita.</p>

      <div className="mb-5 grid grid-cols-2 gap-2 rounded-[15px] border border-border bg-card p-1" role="group" aria-label="Elegí cómo ingresar">
        <button
          type="button"
          onClick={() => chooseMethod("password")}
          disabled={loading}
          aria-pressed={method === "password"}
          className={`rounded-xl px-2 py-3 text-[13px] font-bold disabled:opacity-65 ${method === "password" ? "bg-primary text-primary-foreground" : "text-foreground/75"}`}
        >
          Con contraseña
        </button>
        <button
          type="button"
          onClick={() => chooseMethod("email")}
          disabled={loading}
          aria-pressed={method === "email"}
          className={`rounded-xl px-2 py-3 text-[13px] font-bold disabled:opacity-65 ${method === "email" ? "bg-primary text-primary-foreground" : "text-foreground/75"}`}
        >
          Enlace por email
        </button>
      </div>

      <form onSubmit={handleSubmit} className="grid gap-3">
        {method === "password" ? (
          <>
            <label className="flex items-center gap-2.5 rounded-[15px] border border-border bg-card px-3.75 text-foreground/75">
              <UserRound size={17} />
              <input
                name="identifier"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                placeholder="Usuario o email"
                aria-label="Usuario o email"
                autoComplete="username"
                required
                className="h-13 w-full border-0 bg-transparent text-[13px] text-foreground outline-none"
              />
            </label>

            <label className="flex items-center gap-2.5 rounded-[15px] border border-border bg-card px-3.75 text-foreground/75">
              <LockKeyhole size={17} />
              <input
                name="password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Contraseña"
                aria-label="Contraseña"
                autoComplete="current-password"
                required
                className="h-13 w-full border-0 bg-transparent text-[13px] text-foreground outline-none"
              />
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                className="flex h-11 w-11 shrink-0 items-center justify-center text-foreground/75 transition-colors hover:text-foreground"
              >
                {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
              </button>
            </label>
          </>
        ) : (
          <>
            <p className="text-[13px] leading-relaxed text-foreground/75">Te vamos a mandar un enlace para entrar sin contraseña.</p>
            <label className="flex items-center gap-2.5 rounded-[15px] border border-border bg-card px-3.75 text-foreground/75">
              <Mail size={17} />
              <input
                name="email"
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setLinkSent(false);
                }}
                placeholder="Tu email"
                aria-label="Tu email"
                autoComplete="email"
                required
                className="h-13 w-full border-0 bg-transparent text-[13px] text-foreground outline-none"
              />
            </label>
          </>
        )}

        {error && (
          <p role="alert" className="rounded-lg bg-red-600 px-3 py-2 text-[12px] text-white">
            {error}
          </p>
        )}
        {method === "email" && linkSent && (
          <p role="status" className="rounded-[15px] border border-border bg-card p-4 text-[13px] leading-relaxed text-foreground">
            Si ese email está registrado, vas a recibir un enlace para ingresar. Revisá también la carpeta de spam.
          </p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="mt-1.5 flex h-13 items-center justify-between rounded-[15px] bg-primary px-4.5 text-[13px] font-bold text-primary-foreground disabled:opacity-65"
        >
          {loading ? (
            <>
              <span>{method === "email" ? "Enviando..." : "Ingresando..."}</span>
              <Spinner />
            </>
          ) : (
            <>
              <span>{method === "email" ? (linkSent ? "Reenviar enlace" : "Enviar enlace") : "Ingresar"}</span>
              <ArrowRight size={17} />
            </>
          )}
        </button>
      </form>

      <p className="mt-6.25 mb-2 text-center text-sm leading-normal text-foreground/75">
        ¿Todavía no sos parte de BonusBissen?{" "}
        <Link href={`/sign-up${authQuery}`} className="inline-flex min-h-11 items-center font-bold text-foreground no-underline">
          Registrate
        </Link>
      </p>
      <Link href="/d/sign-in" className="mt-auto flex min-h-11 items-center justify-center text-center text-[11px] leading-normal font-bold text-foreground no-underline">
        Ingresar al panel administrativo
      </Link>
    </main>
  );
}
