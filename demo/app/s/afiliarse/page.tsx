"use client";

import { Suspense, useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DemoDock } from "@/components/demo-dock";
import { LandingParticles } from "@/components/landing-particles";
import { PageTour } from "@/components/page-tour";
import { Spinner } from "@/components/spinner";
import { getStorefrontDiscoverInfoSync, joinStorefront } from "@/lib/demo/actions";
import { currentCustomer, isMemberOfStorefront, useDemoState } from "@/lib/demo/store";
import { CARD_PALETTES, pickCardVariant } from "@/lib/helpers/color";

export default function AfiliarsePage() {
  return (
    <Suspense fallback={null}>
      <AfiliarseView />
    </Suspense>
  );
}

function AfiliarseView() {
  const router = useRouter();
  const storefrontId = useSearchParams().get("local") ?? "";
  const state = useDemoState();
  const customer = state ? currentCustomer(state) : null;
  const storefront = state ? getStorefrontDiscoverInfoSync(state, storefrontId) : null;
  const isMember = Boolean(state && customer && isMemberOfStorefront(state, customer.id, storefrontId));
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!state) return;
    if (!storefront) router.replace("/b");
    else if (isMember) router.replace(`/s/inicio?local=${encodeURIComponent(storefrontId)}`);
  }, [state, storefront, isMember, storefrontId, router]);

  if (!state || !storefront || isMember) {
    return (
      <div className="flex min-h-svh items-center justify-center gap-2 bg-background text-sm text-foreground/80">
        <Spinner />
        <span>Cargando...</span>
      </div>
    );
  }

  function handleJoin() {
    if (!customer) {
      router.push(`/sign-in?joinTo=${encodeURIComponent(storefrontId)}`);
      return;
    }

    setError(null);
    startTransition(async () => {
      const result = await joinStorefront(storefrontId);
      if (!result.ok) setError(result.error);
      else router.push(`/s/inicio?local=${encodeURIComponent(storefrontId)}`);
    });
  }

  const logoUrl = storefront.orgLogoUrl;
  const palette = CARD_PALETTES[pickCardVariant(storefront.color)];

  return (
    <main
      className="relative isolate flex min-h-dvh overflow-hidden bg-background text-foreground"
      style={
        {
          "--storefront-color": storefront.color,
          "--storefront-soft": `${storefront.color}22`,
          "--storefront-border": `${storefront.color}55`,
        } as React.CSSProperties
      }
    >
      <LandingParticles color={storefront.color} seed={storefront.id} />

      <div className="relative z-10 mx-auto flex w-full max-w-sm flex-1 flex-col px-6 py-7 sm:py-9">
        <Link
          href="/b"
          className="flex w-fit items-center gap-2 rounded-full border px-3.5 py-2 text-xs font-medium text-foreground transition-colors hover:border-(--storefront-color) hover:bg-(--storefront-soft)"
          style={{ borderColor: "var(--storefront-border)" }}
        >
          <ArrowLeft className="size-3.5" aria-hidden="true" />
          Volver
        </Link>

        <div className="flex flex-1 flex-col items-center justify-center gap-7 py-12 text-center">
          <div
            className="grid size-24 place-items-center overflow-hidden rounded-[28px] border bg-card text-3xl font-bold shadow-[0_16px_40px_rgba(25,24,23,0.1)]"
            style={{ borderColor: "var(--storefront-border)" }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            {logoUrl ? <img src={logoUrl} alt={`Logo de ${storefront.orgName}`} className="size-full object-cover" /> : storefront.orgName.charAt(0).toUpperCase()}
          </div>

          <div className="max-w-xs">
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-foreground">{storefront.orgName}</p>

            <h1 className="mt-3 text-[30px] font-semibold leading-[1.05] tracking-[-0.055em] text-foreground text-balance">
              ¿Querés ser parte de {storefront.orgName} y empezar a sumar{" "}
              <span className="underline decoration-(--storefront-color) decoration-2 underline-offset-4">{storefront.pointLabel ?? "puntos"}</span>?
            </h1>
          </div>
        </div>

        <div className="flex flex-col gap-3 pb-1">
          {error ? (
            <p
              role="alert"
              className="rounded-2xl border px-4 py-3 text-center text-sm leading-5 text-foreground"
              style={{
                borderColor: "var(--storefront-border)",
                backgroundColor: "var(--storefront-soft)",
              }}
            >
              {error}
            </p>
          ) : null}

          <Button
            onClick={handleJoin}
            disabled={pending}
            data-tour="join-button"
            className="h-12 w-full rounded-2xl text-base font-semibold shadow-[0_10px_24px_color-mix(in_srgb,var(--storefront-color)_28%,transparent)] transition-transform hover:brightness-105 active:scale-[0.99] disabled:opacity-60"
            style={{ backgroundColor: "var(--storefront-color)", color: palette.text }}
          >
            {pending ? (
              <>
                <Spinner />
                {" Uniéndote..."}
              </>
            ) : (
              "Quiero sumarme"
            )}
          </Button>
        </div>
      </div>

      <DemoDock side="customer" className="bottom-24" />
      <PageTour
        id="customer-join"
        steps={[
          {
            target: "join-button",
            title: "Así se suma un cliente",
            body: (
              <>
                <p>
                  Es la pantalla que abre el <strong>QR de afiliación</strong> de cada local. Con un toque, el cliente queda afiliado y empieza a sumar{" "}
                  {storefront.pointLabel ?? "puntos"}.
                </p>
                {!customer ? <p>Si todavía no tiene cuenta, primero inicia sesión o se registra, y vuelve acá automáticamente.</p> : null}
              </>
            ),
          },
        ]}
      />
    </main>
  );
}
