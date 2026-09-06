"use client";

import { useUserStore } from "@/lib/user-store";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { signIn } from "@/app/(auth)/sign-in/actions";
import { ArrowRight, LockKeyhole, UserRound } from "lucide-react";
import Link from "next/link";
import { BrandLockup } from "@/components/brand";

export default function SignInPage() {
  const router = useRouter();
  const setUser = useUserStore((state) => state.setUser);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
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
    <main className="auth-page">
      <BrandLockup />
      <h1>
        Volvé a tus
        <br />
        <em>lugares favoritos.</em>
      </h1>
      <p className="auth-lead">Sumá puntos, descubrí recompensas y disfrutá más cada visita.</p>
      <form action={handleSubmit} className="auth-form">
        <label>
          <UserRound size={17} />
          <input name="identifier" placeholder="Usuario o email" autoComplete="username" required />
        </label>
        <label>
          <LockKeyhole size={17} />
          <input name="password" type="password" placeholder="Contraseña" autoComplete="current-password" required />
        </label>
        {error && <p className="auth-error">{error}</p>}
        <button type="submit" disabled={loading}>
          {loading ? (
            <>
              <span>Ingresando...</span>
              <span className="loading-spinner" aria-label="Iniciando sesión" />
            </>
          ) : (
            <>
              <span>Ingresar</span>
              <ArrowRight size={17} />
            </>
          )}
        </button>
      </form>
      <p className="auth-switch">
        ¿Aún no eres parte de BonusBissen? <Link href="/sign-up">Registrate</Link>
      </p>
      <Link className="admin-link" href="/admin/sign-in">
        Ingresar al panel administrativo
      </Link>
    </main>
  );
}
