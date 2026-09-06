"use client";

import { useUserStore } from "@/lib/user-store";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { signUp } from "@/app/(auth)/sign-up/actions";
import { BrandLockup } from "@/components/brand";
import { ArrowRight, CircleUserRound, LockKeyhole, UserRound } from "lucide-react";

export default function SignUpPage() {
  const router = useRouter();
  const setUser = useUserStore((state) => state.setUser);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  async function handleSubmit(formData: FormData) {
    setLoading(true);
    setError("");
    const result = await signUp(formData);
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
          <CircleUserRound size={17} />
          <input name="name" placeholder="Nombre de tu cuenta" autoComplete="off" required />
        </label>
        <label>
          <UserRound size={17} />
          <input name="username" placeholder="Usuario" autoComplete="off" required />
        </label>
        <label>
          <UserRound size={17} />
          <input name="email" placeholder="Correo electrónico" autoComplete="email" required />
        </label>
        <label>
          <LockKeyhole size={17} />
          <input name="password" type="password" placeholder="Contraseña" autoComplete="off" required />
        </label>
        {error && <p className="auth-error">{error}</p>}
        <button type="submit" disabled={loading}>
          {loading ? (
            <>
              <span>Registrandose...</span>
              <span className="loading-spinner" aria-label="Iniciando sesión" />
            </>
          ) : (
            <>
              <span>Registrarse</span>
              <ArrowRight size={17} />
            </>
          )}
        </button>
      </form>
      <p className="auth-switch">
        ¿Ya tenés una cuenta? <Link href="/sign-in">Inicia sesión</Link>
      </p>
    </main>
  );
}
