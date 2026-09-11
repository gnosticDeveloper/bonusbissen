"use client";

import { useUserStore } from "@/lib/user-store";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { signIn } from "@/app/(auth)/sign-in/actions";
import { ArrowRight, Eye, EyeOff, LockKeyhole, UserRound } from "lucide-react";
import Link from "next/link";
import { BrandLockup } from "@/components/brand";
import { Spinner } from "@/components/spinner";

export default function SignInPage() {
  const router = useRouter();
  const setUser = useUserStore((state) => state.setUser);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  async function handleSubmit(formData: FormData) {
    setLoading(true);
    setError("");
    const result = await signIn(formData);
    if (!result.ok) {
      setError(result.error);
      setLoading(false);
      return;
    }
    setUser(result.data);
    router.push("/b");
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-107.5 flex-col bg-background px-6.5 pt-13.5 pb-8 text-foreground">
      <BrandLockup />

      <h1 className="mt-4.25 mb-3 text-[38px] leading-none text-foreground">
        Volvé a tus
        <br />
        <em className="text-primary not-italic">lugares favoritos.</em>
      </h1>

      <p className="mb-8.5 max-w-72.5 text-[13px] leading-[1.55] text-muted">Sumá puntos, descubrí recompensas y disfrutá más cada visita.</p>

      <form action={handleSubmit} className="grid gap-3">
        <label className="flex items-center gap-2.5 rounded-[15px] border border-border bg-card px-3.75 text-muted">
          <UserRound size={17} />
          <input
            name="identifier"
            placeholder="Usuario o email"
            autoComplete="username"
            required
            className="h-13 w-full border-0 bg-transparent text-[13px] text-foreground outline-none"
          />
        </label>

        <label className="flex items-center gap-2.5 rounded-[15px] border border-border bg-card px-3.75 text-muted">
          <LockKeyhole size={17} />
          <input
            name="password"
            type={showPassword ? "text" : "password"}
            placeholder="Contraseña"
            autoComplete="current-password"
            required
            className="h-13 w-full border-0 bg-transparent text-[13px] text-foreground outline-none"
          />
          <button
            type="button"
            onClick={() => setShowPassword((prev) => !prev)}
            aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
            className="shrink-0 text-muted transition-colors hover:text-foreground"
          >
            {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
          </button>
        </label>

        {error && <p className="text-[11px] text-[#d75877]">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="mt-1.5 flex h-13 items-center justify-between rounded-[15px] bg-primary px-4.5 text-[13px] font-bold text-white disabled:opacity-65"
        >
          {loading ? (
            <>
              <span>Ingresando...</span>
              <Spinner />
            </>
          ) : (
            <>
              <span>Ingresar</span>
              <ArrowRight size={17} />
            </>
          )}
        </button>
      </form>

      <p className="mt-6.25 mb-2 text-center text-sm leading-normal text-muted">
        ¿Aún no eres parte de BonusBissen?{" "}
        <Link href="/sign-up" className="font-bold text-primary no-underline">
          Registrate
        </Link>
      </p>
      <Link href="/d/sign-in" className="mt-auto text-center text-[11px] leading-normal font-bold text-primary no-underline">
        Ingresar al panel administrativo
      </Link>
    </main>
  );
}
