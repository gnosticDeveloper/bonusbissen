"use client";

import { Suspense, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowRight, CircleUserRound, Eye, EyeOff, LockKeyhole, UserRound } from "lucide-react";
import { BrandLockup } from "@/components/brand";
import { Spinner } from "@/components/spinner";
import { DemoDock } from "@/components/demo-dock";
import { PageTour } from "@/components/page-tour";
import { customerSignUp } from "@/lib/demo/actions";
import { afterAuthPath, buildAuthQueryString } from "@/lib/demo/redirect";

export default function SignUpPage() {
  return (
    <Suspense fallback={null}>
      <SignUpForm />
    </Suspense>
  );
}

function SignUpForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const result = await customerSignUp({ name, username, email, password });
    if (!result.ok) {
      setError(result.error);
      setLoading(false);
      return;
    }
    router.replace(afterAuthPath(searchParams));
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

      <form onSubmit={handleSubmit} className="grid gap-3" data-tour="sign-up-form">
        <label className="flex items-center gap-2.5 rounded-[15px] border border-border bg-card px-3.75 text-foreground/75">
          <CircleUserRound size={17} />
          <input
            name="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Nombre público: Juan Perez"
            autoComplete="off"
            required
            className="h-13 w-full border-0 bg-transparent text-[13px] text-foreground outline-none"
          />
        </label>
        <label className="flex items-center gap-2.5 rounded-[15px] border border-border bg-card px-3.75 text-foreground/75">
          <UserRound size={17} />
          <input
            name="username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="Nombre de usuario: juanperez123"
            autoComplete="off"
            required
            className="h-13 w-full border-0 bg-transparent text-[13px] text-foreground outline-none"
          />
        </label>
        <label className="flex items-center gap-2.5 rounded-[15px] border border-border bg-card px-3.75 text-foreground/75">
          <UserRound size={17} />
          <input
            name="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Correo electrónico"
            autoComplete="email"
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
            autoComplete="new-password"
            required
            className="h-13 w-full border-0 bg-transparent text-[13px] text-foreground outline-none"
          />
          <button
            type="button"
            onClick={() => setShowPassword((prev) => !prev)}
            aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
            className="shrink-0 py-3 pl-3 pr-1.5 text-foreground/75 transition-colors hover:text-foreground"
          >
            {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
          </button>
        </label>

        {error && (
          <p role="alert" className="rounded-lg bg-red-600 px-3 py-2 text-[11px] text-white">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="mt-1.5 flex h-13 items-center justify-between rounded-[15px] bg-primary px-4.5 text-[13px] font-bold text-primary-foreground disabled:opacity-65"
        >
          {loading ? (
            <>
              <span>Registrandose...</span>
              <Spinner />
            </>
          ) : (
            <>
              <span>Registrarse</span>
              <ArrowRight size={17} />
            </>
          )}
        </button>
      </form>

      <p className="mt-6.25 mb-2 text-center text-sm leading-normal text-foreground/75">
        ¿Ya tenés una cuenta?{" "}
        <Link href={`/sign-in${authQuery}`} className="font-bold text-foreground no-underline">
          Inicia sesión
        </Link>
      </p>

      <DemoDock side="auth" className="bottom-4" />
      <PageTour
        id="customer-sign-up"
        steps={[
          {
            target: "sign-up-form",
            title: "Creá una cuenta de prueba",
            body: (
              <p>
                Usá datos inventados: la cuenta existe solo en esta pestaña. Vas a empezar sin puntos, así que podés afiliarte a un negocio y pedirle puntos
                desde el panel administrativo.
              </p>
            ),
          },
        ]}
      />
    </main>
  );
}
