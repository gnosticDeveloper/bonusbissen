"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { getAllOrganizations, OrganizationOption, selectStorefront, signIn } from "@/app/d/sign-in/actions";
import { ArrowRight, Eye, EyeOff, LockKeyhole, UserRound } from "lucide-react";
import Link from "next/link";
import { BrandLockup } from "@/components/brand";
import { Spinner } from "@/components/spinner";
import { Autocomplete } from "@/components/autocomplete-input";
import { useModal } from "@/components/modal";
import { SelectStorefrontModal } from "@/components/modals/sign-in/select-storefront-modal";

export default function DashboardSignInPage() {
  const router = useRouter();
  const { open } = useModal();
  const [org, setOrg] = useState<OrganizationOption | null>(null);
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
    if (result.data.storefronts.length === 1) {
      await selectStorefront(result.data.storefronts[0].id);
      router.push(`/d/${result.data.storefronts[0].id}/inicio`);
    } else {
      open(<SelectStorefrontModal storefronts={result.data.storefronts} />, {
        title: "Selecciona un local donde entrar",
        description: "Antes de entrar al panel, debes seleccionar un local para entrar.",
      });
    }

    setLoading(false);
  }

  return (
    <main className="mx-auto flex min-h-svh w-full max-w-107.5 flex-col bg-background px-6.5 pt-13.5 pb-8 text-foreground">
      <BrandLockup />

      <h1 className="mt-4.25 mb-3 text-[38px] leading-none text-foreground">
        Panel
        <br />
        <em className="text-primary not-italic">administrativo.</em>
      </h1>

      <p className="mb-8.5 max-w-72.5 text-[13px] leading-[1.55] text-muted">Elegí tu negocio para gestionar puntos, canjes y recompensas.</p>

      <div className="mb-3">
        <Autocomplete<OrganizationOption>
          selected={org}
          onSelect={setOrg}
          onClear={() => setOrg(null)}
          fetchFn={getAllOrganizations}
          getId={(o) => o.id}
          displayKeys={["name"]}
          placeholder="Buscar tu negocio…"
        />
      </div>

      {org && (
        <form action={handleSubmit} className="grid gap-3">
          <input type="hidden" name="organizationId" value={org.id} />

          <label className="flex items-center gap-2.5 rounded-[15px] border border-border bg-card px-3.75 text-muted">
            <UserRound size={17} />
            <input
              name="identifier"
              placeholder="Usuario"
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
              className="shrink-0 py-3 pl-3 pr-1.5 text-muted transition-colors hover:text-foreground"
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
      )}

      <Link href="/sign-in" className="mt-auto text-center text-[11px] leading-normal font-bold text-primary no-underline">
        Volver al inicio de sesión de clientes
      </Link>
    </main>
  );
}
