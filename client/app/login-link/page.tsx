"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowRight, MailCheck } from "lucide-react";
import { consumeLoginLink } from "@/app/(auth)/sign-in/actions";
import { BrandLockup } from "@/components/brand";
import { Spinner } from "@/components/spinner";
import { buildAuthQueryString, completeAuthRedirect } from "@/lib/helpers/auth-redirect";

export default function LoginLinkPage() {
  return (
    <Suspense fallback={null}>
      <LoginLinkConfirmation />
    </Suspense>
  );
}

function LoginLinkConfirmation() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token")?.trim();
  const [loading, setLoading] = useState(false);
  const [consumed, setConsumed] = useState(false);
  const [error, setError] = useState("");
  const authQuery = buildAuthQueryString(searchParams);

  async function handleConfirm() {
    if (!token || loading) return;
    setLoading(true);
    setError("");

    let result;
    try {
      result = await consumeLoginLink(token);
    } catch {
      setError("No pudimos ingresar con este enlace. Intentá de nuevo o pedí uno nuevo.");
      setLoading(false);
      return;
    }

    if (!result.ok) {
      setError(result.error || "Este enlace no es válido o venció. Pedí uno nuevo.");
      setLoading(false);
      return;
    }

    const redirectParams = new URLSearchParams(searchParams.toString());
    setConsumed(true);
    const cleanUrl = new URL(window.location.href);
    cleanUrl.searchParams.delete("token");
    window.history.replaceState(window.history.state, "", `${cleanUrl.pathname}${cleanUrl.search}${cleanUrl.hash}`);

    // El redirect puede lanzar internamente; no incluirlo en el catch anterior.
    await completeAuthRedirect(router, redirectParams);
  }

  return (
    <main className="mx-auto flex min-h-svh w-full max-w-107.5 flex-col bg-background px-6.5 pt-13.5 pb-8 text-foreground">
      <BrandLockup />
      <section className="mt-10 rounded-[20px] border border-border bg-card p-6">
        <MailCheck size={32} className="text-foreground" aria-hidden="true" />
        <h1 className="mt-5 text-[32px] leading-tight text-foreground">Ingresá con tu enlace</h1>
        {consumed ? (
          <p role="status" className="mt-3 text-[13px] leading-relaxed text-foreground/75">Estamos terminando tu ingreso...</p>
        ) : token ? (
          <p className="mt-3 text-[13px] leading-relaxed text-foreground/75">
            Para cuidar tu cuenta, confirmá que querés ingresar. El enlace se usa solo cuando tocás el botón.
          </p>
        ) : (
          <p role="alert" className="mt-3 rounded-lg bg-red-600 px-3 py-2 text-[13px] leading-relaxed text-white">
            A este enlace le falta información. Pedí uno nuevo desde la página de ingreso.
          </p>
        )}
        {error && (
          <p role="alert" className="mt-4 rounded-lg bg-red-600 px-3 py-2 text-[13px] text-white">
            {error}
          </p>
        )}
        {token && !consumed && (
          <button
            type="button"
            onClick={handleConfirm}
            disabled={loading}
            className="mt-6 flex h-13 w-full items-center justify-between rounded-[15px] bg-primary px-4.5 text-[13px] font-bold text-primary-foreground disabled:opacity-65"
          >
            {loading ? (
              <>
                <span>Ingresando...</span>
                <Spinner />
              </>
            ) : (
              <>
                <span>Confirmar ingreso</span>
                <ArrowRight size={17} />
              </>
            )}
          </button>
        )}
      </section>
      <Link href={`/sign-in${authQuery}`} className="mt-6 flex min-h-11 items-center justify-center text-center text-[13px] font-bold text-foreground no-underline">
        Volver al ingreso
      </Link>
    </main>
  );
}
