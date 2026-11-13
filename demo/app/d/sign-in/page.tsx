"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { ArrowRight, Eye, EyeOff, LockKeyhole, UserRound } from "lucide-react";
import Link from "next/link";
import { BrandLockup } from "@/components/brand";
import { Spinner } from "@/components/spinner";
import { Autocomplete } from "@/components/autocomplete-input";
import { useModal } from "@/components/modal";
import { SelectStorefrontModal } from "@/components/modals/sign-in/select-storefront-modal";
import { DemoCredentials } from "@/components/demo-credentials";
import { DemoDock } from "@/components/demo-dock";
import { PageTour } from "@/components/page-tour";
import { getAllOrganizations, staffSignIn, type OrganizationOption } from "@/lib/demo/actions";
import { DEMO_CREDENTIALS } from "@/lib/demo/seed";
import { managedOrg, useDemoState } from "@/lib/demo/store";

export default function DashboardSignInPage() {
  const router = useRouter();
  const { open } = useModal();
  const state = useDemoState();
  const [org, setOrg] = useState<OrganizationOption | null>(null);
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!org || loading) return;
    setLoading(true);
    setError("");
    const result = await staffSignIn(org.id, identifier, password);
    if (!result.ok) {
      setError(result.error);
      setLoading(false);
      return;
    }
    if (result.data.storefronts.length === 1) {
      router.replace("/d/inicio");
    } else {
      open(<SelectStorefrontModal storefronts={result.data.storefronts} />, {
        title: "Selecciona un local donde entrar",
        description: "Antes de entrar al panel, debes seleccionar un local para entrar.",
      });
    }

    setLoading(false);
  }

  function fillAccount(account: { identifier: string; password: string }) {
    if (state && !org) {
      const demoOrg = managedOrg(state);
      setOrg({ id: demoOrg.id, name: demoOrg.name });
    }
    setIdentifier(account.identifier);
    setPassword(account.password);
    setError("");
  }

  return (
    <main className="mx-auto flex min-h-svh w-full max-w-107.5 flex-col bg-background px-6.5 pt-13.5 pb-8 text-foreground">
      <BrandLockup />

      <h1 className="mt-4.25 mb-3 text-[38px] leading-none text-foreground">
        Panel
        <br />
        <em className="text-foreground not-italic">administrativo.</em>
      </h1>

      <p className="mb-8.5 max-w-72.5 text-[13px] leading-[1.55] text-foreground/80">Elegí tu negocio para gestionar puntos, canjes y recompensas.</p>

      <div className="mb-3" data-tour="org-search">
        <Autocomplete<OrganizationOption>
          selected={org}
          onSelect={setOrg}
          onClear={() => setOrg(null)}
          fetchFn={getAllOrganizations}
          getId={(o) => o.id}
          displayKeys={["name"]}
          placeholder="Buscar tu negocio…"
          minQueryLength={1}
        />
      </div>

      {org && (
        <form onSubmit={handleSubmit} className="grid gap-3">
          <label className="flex items-center gap-2.5 rounded-[15px] border border-border bg-card px-3.75 text-foreground/80">
            <UserRound size={17} />
            <input
              name="identifier"
              placeholder="Usuario"
              autoComplete="username"
              required
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              className="h-13 w-full border-0 bg-transparent text-[13px] text-foreground outline-none"
            />
          </label>

          <label className="flex items-center gap-2.5 rounded-[15px] border border-border bg-card px-3.75 text-foreground/80">
            <LockKeyhole size={17} />
            <input
              name="password"
              type={showPassword ? "text" : "password"}
              placeholder="Contraseña"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="h-13 w-full border-0 bg-transparent text-[13px] text-foreground outline-none"
            />
            <button
              type="button"
              onClick={() => setShowPassword((prev) => !prev)}
              aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
              className="shrink-0 py-3 pl-3 pr-1.5 text-foreground/80 transition-colors hover:text-foreground"
            >
              {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
            </button>
          </label>

          {error && <p className="rounded-md bg-red-500/15 px-2 py-1 text-[11px] text-foreground">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="mt-1.5 flex h-13 items-center justify-between rounded-[15px] bg-primary px-4.5 text-[13px] font-bold text-primary-foreground disabled:opacity-65"
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
      )}

      <div className="mt-5">
        <DemoCredentials
          accounts={[
            { label: DEMO_CREDENTIALS.admin.name, detail: DEMO_CREDENTIALS.admin.role, identifier: DEMO_CREDENTIALS.admin.identifier, password: DEMO_CREDENTIALS.admin.password },
            { label: DEMO_CREDENTIALS.cashier.name, detail: DEMO_CREDENTIALS.cashier.role, identifier: DEMO_CREDENTIALS.cashier.identifier, password: DEMO_CREDENTIALS.cashier.password },
          ]}
          onUse={fillAccount}
        />
      </div>

      <Link href="/sign-in" className="mt-auto pt-6 text-center text-[11px] leading-normal font-bold text-foreground no-underline">
        Volver al inicio de sesión de clientes
      </Link>

      <DemoDock side="auth" className="bottom-4" />
      <PageTour
        id="staff-sign-in"
        ready={state !== null}
        steps={[
          {
            target: "org-search",
            title: "Entrá al panel de tu negocio",
            body: (
              <p>
                Primero buscás tu negocio y después ingresás con tu usuario. En la demo hay uno solo: escribí «Tu negocio» o usá una cuenta de ejemplo.
              </p>
            ),
          },
          {
            target: "demo-credentials",
            title: "Dos roles para probar",
            body: (
              <>
                <p>
                  <strong>Administradora</strong>: ve todo, incluidas las secciones de la organización (sucursales, programas, equipo, facturación y
                  auditoría). Como trabaja en dos locales, elige uno al entrar.
                </p>
                <p>
                  <strong>Cajero</strong>: solo opera su local (puntos, canjes y recompensas en modo lectura).
                </p>
              </>
            ),
          },
        ]}
      />
    </main>
  );
}
