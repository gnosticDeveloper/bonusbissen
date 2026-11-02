"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { billingMoney, type BillingPlan } from "@/lib/billing";
import { getBillingPlans, loadBilling, selectBillingPlan } from "./actions";
import { PlanArt } from "./plan-art";
import { useBillingFlow, type BillingScreenProps } from "./use-billing-flow";

const checklist = ["Gestión de sucursales", "Programa de puntos y recompensas", "Acceso para tu equipo"];

export function PlanSelectionScreen({ expectedOrganizationId, onContinue, disabled = false }: BillingScreenProps) {
  const { data, busy, error, run, reload, setError } = useBillingFlow(getBillingPlans, expectedOrganizationId);

  function choose(plan: BillingPlan) {
    if (!data || disabled) return;
    const organizationId = data.organization.id;
    void run(async (signal) => {
      const saved = await selectBillingPlan(organizationId, plan.id);
      if (signal.aborted) return;
      if (!saved.ok) {
        setError(saved.error);
        return;
      }
      // Verify the persisted organization before handing control to the parent.
      // Its response has no plan ID: never infer ID or price from the name.
      const verified = await loadBilling(organizationId);
      if (signal.aborted) return;
      if (!verified.ok) {
        setError(verified.error);
        return;
      }
      if (verified.data.organization.billingPlanName !== plan.name) {
        setError("Todavía no pudimos confirmar el plan. Reintentá la consulta.");
        return;
      }
      if (onContinue) onContinue();
      else window.location.assign("/onboarding/pago");
    });
  }

  return (
    <fieldset disabled={disabled || busy} aria-busy={busy} className="min-w-0 space-y-8">
      <header className="space-y-3 text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-foreground/65">Un plan para tu negocio</p>
        <h2 className="text-3xl font-semibold tracking-tight">Elegí cómo empezar</h2>
        <p className="mx-auto max-w-lg text-sm text-foreground/65">
          Encontrá tu plan y después autorizá los cobros en Mercado Pago. Todos los importes son mensuales.
        </p>
      </header>
      {busy && (
        <p role="status" className="text-center text-sm">
          Cargando planes…
        </p>
      )}
      {error && (
        <div role="alert" className="space-y-3 rounded-2xl border border-destructive p-4">
          <p>{error}</p>
          <Button
            type="button"
            variant="outline"
            onClick={() =>
              void run(async (signal) => {
                await reload(signal);
              })
            }
          >
            Reintentar consulta de planes
          </Button>
        </div>
      )}
      {data && (
        <>
          {data.plans.length === 0 ? (
            <p role="status" className="rounded-2xl border p-6 text-center">
              Por ahora no hay planes disponibles. Volvé a intentarlo más tarde.
            </p>
          ) : (
            <div className={`grid gap-5 ${data.plans.length === 1 ? "sm:mx-auto sm:max-w-sm" : "sm:grid-cols-2 xl:grid-cols-3"}`}>
              {data.plans.map((plan) => (
                <article
                  key={plan.id}
                  className="flex flex-col overflow-hidden rounded-3xl border border-zinc-700 bg-zinc-950 text-zinc-50 shadow-xl"
                >
                  <div className="aspect-2/1 overflow-hidden border-b border-zinc-800">
                    <PlanArt />
                  </div>
                  <div className="flex flex-1 flex-col gap-6 p-6">
                    <div className="space-y-3">
                      <h3 className="wrap-break-word text-xl font-semibold">{plan.name}</h3>
                      <p>
                        <span className="text-3xl font-semibold tracking-tight">{billingMoney(plan.price, plan.currency)}</span>{" "}
                        <span className="text-sm text-zinc-400">{plan.currency} / mes</span>
                      </p>
                    </div>
                    <ul className="flex-1 space-y-3 text-sm text-zinc-300">
                      {checklist.map((item) => (
                        <li key={item} className="flex gap-3">
                          <span aria-hidden="true" className="text-primary">
                            ✓
                          </span>
                          {item}
                        </li>
                      ))}
                    </ul>
                    <Button
                      type="button"
                      disabled={!!error}
                      className="h-11 w-full bg-primary text-primary-foreground hover:bg-primary/90"
                      onClick={() => choose(plan)}
                      aria-label={`Elegir plan ${plan.name}, ${billingMoney(plan.price, plan.currency)} ${plan.currency} por mes`}
                    >
                      Elegir este plan
                    </Button>
                  </div>
                </article>
              ))}
            </div>
          )}
          <p className="text-center text-xs text-foreground/65">
            Al elegir un plan lo guardamos en tu negocio. Todavía no estás autorizando un cobro.
          </p>
        </>
      )}
      {!data && !busy && (
        <p className="text-sm text-foreground/65">
          <Link className="underline" href="/onboarding?ingresar=1">
            Volvé a ingresar a tu negocio.
          </Link>
        </p>
      )}
    </fieldset>
  );
}
