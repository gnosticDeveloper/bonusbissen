"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { safeCheckoutUrl, subscriptionLabel } from "@/lib/billing";
import { loadBilling, startCheckout } from "./actions";
import { BillingFooter } from "./billing-footer";
import { PlanArt } from "./plan-art";
import { POLL_INTERVAL_MS, PollBudget } from "./request-gate";
import { useBillingFlow, type BillingScreenProps } from "./use-billing-flow";

export function PaymentScreen(props: BillingScreenProps) {
  return <PaymentSession key={props.expectedOrganizationId ?? "current"} {...props} />;
}

function PaymentSession({ expectedOrganizationId, onContinue, disabled = false }: BillingScreenProps) {
  const { data, busy, error, run, reload, setError } = useBillingFlow(loadBilling, expectedOrganizationId);
  const [email, setEmail] = useState<string | null>(null);
  const [checkout, setCheckout] = useState<string | null>(null);
  const budget = useRef(new PollBudget());
  const org = data?.organization;
  const status = org?.mercadoPagoSubscriptionStatus ?? null;
  const pending = status === "pending" || (!!checkout && status === null);
  const canCheckout = status === null || ["pending", "paused", "cancelled", "finished"].includes(status);

  useEffect(() => {
    if (!pending || disabled || error) return;
    let timer: ReturnType<typeof setTimeout>;
    let stopped = false;
    const check = async () => {
      if (stopped || document.visibilityState === "hidden") return;
      if (!budget.current.take()) {
        stop();
        return;
      }
      await run(async (signal) => {
        await reload(signal);
      });
    };
    const tick = async () => {
      await check();
      if (!stopped) timer = setTimeout(() => void tick(), POLL_INTERVAL_MS);
    };
    const onFocus = () => {
      void check();
    };
    const onVisible = () => {
      if (document.visibilityState === "visible") void check();
    };
    function stop() {
      stopped = true;
      clearTimeout(timer);
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisible);
    }
    timer = setTimeout(() => void tick(), POLL_INTERVAL_MS);
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisible);
    return stop;
  }, [pending, disabled, error, reload, run]);

  async function prepareCheckout() {
    if (!org || disabled || checkout) return;
    await run(async (signal) => {
      const result = await startCheckout(org.id, email ?? org.billingEmail ?? "");
      if (signal.aborted) return;
      if (!result.ok) {
        setError(result.error);
        return;
      }
      const url = safeCheckoutUrl(result.data.initPoint);
      if (!url) {
        setError("No pudimos verificar el enlace de Mercado Pago. Reintentá la consulta.");
        return;
      }
      setCheckout(url);
      await reload(signal);
    });
  }

  async function continueSetup() {
    await run(async (signal) => {
      const verified = await reload(signal);
      if (signal.aborted || !verified) return;
      if (verified.organization.mercadoPagoSubscriptionStatus !== "authorized") {
        setError("La autorización todavía no está confirmada. Reintentá la consulta en un momento.");
        return;
      }
      if (onContinue) onContinue();
      else window.location.assign("/onboarding");
    });
  }

  return (
    <fieldset disabled={disabled || busy} aria-busy={busy} className="min-w-0 space-y-7">
      {busy && (
        <p role="status" className="text-sm text-foreground/65">
          Estamos consultando la información de tu negocio…
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
            Reintentar consulta de autorización
          </Button>
        </div>
      )}
      {!org && !busy && (
        <p className="text-sm text-foreground/65">
          <Link href="/onboarding" className="underline">
            Volvé a Organización para ingresar con tu cuenta administradora.
          </Link>
        </p>
      )}
      {org && (
        <div className="grid items-start gap-8 lg:grid-cols-[1.2fr_1fr]">
          <section aria-labelledby="checkout-title" className="space-y-6 py-2">
            <div className="space-y-3">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-foreground/65">Último paso para autorizar los cobros</p>
              <h2 id="checkout-title" className="text-3xl font-semibold tracking-tight">
                Seguimos con Mercado Pago
              </h2>
              <p className="text-sm leading-relaxed text-foreground/65">
                Autorizá la suscripción mensual de {org.name} desde tu cuenta de Mercado Pago. Los datos de pago se ingresan allá, no acá.
              </p>
            </div>
            <p role="status" className="rounded-xl border border-border bg-muted/30 p-4 text-sm">
              {subscriptionLabel(status)}
            </p>
            {!org.billingPlanName ? (
              <div className="space-y-3 rounded-xl border border-border p-5">
                <p>Primero elegí un plan para tu negocio.</p>
                <Link className="font-medium underline underline-offset-4" href="/onboarding">
                  Ir al onboarding para elegir mi plan
                </Link>
              </div>
            ) : status === "authorized" ? (
              <div className="space-y-4">
                <p className="text-sm">
                  ¡Listo! Ya autorizaste los cobros recurrentes. Podés seguir configurando tu negocio. Esta autorización no confirma un pago.
                </p>
                <Button type="button" className="h-11 w-full" onClick={() => void continueSetup()} disabled={!!error}>
                  Continuar configuración
                </Button>
              </div>
            ) : canCheckout ? (
              <form
                className="space-y-4"
                onSubmit={(event) => {
                  event.preventDefault();
                  void prepareCheckout();
                }}
              >
                <div className="space-y-2">
                  <label className="block text-sm font-medium" htmlFor="payer-email">
                    Email de tu cuenta de Mercado Pago
                  </label>
                  <input
                    id="payer-email"
                    className="h-12 w-full rounded-xl border border-border bg-background px-4 text-sm outline-none focus-visible:ring-2 focus-visible:ring-primary"
                    type="email"
                    autoComplete="email"
                    required
                    value={email ?? org.billingEmail ?? ""}
                    disabled={!!checkout || !!error}
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder="tu@email.com"
                  />
                  <p className="text-xs text-foreground/65">Usá el correo de la cuenta con la que vas a autorizar los cobros.</p>
                </div>
                {!checkout && (
                  <>
                    {(status === "pending" || status === "paused") && (
                      <p className="text-xs text-foreground/65">
                        Si iniciás una nueva autorización, se reemplaza la anterior que quedó pendiente o pausada.
                      </p>
                    )}
                    <Button type="submit" className="h-12 w-full" disabled={!!error}>
                      Preparar pago con Mercado Pago
                    </Button>
                  </>
                )}
                {checkout && !error && (
                  <a
                    href={checkout}
                    rel="noreferrer"
                    aria-disabled={disabled || busy}
                    tabIndex={disabled || busy ? -1 : undefined}
                    onClick={(event) => {
                      if (disabled || busy) event.preventDefault();
                    }}
                    className="flex min-h-12 items-center justify-center rounded-xl bg-primary px-4 py-3 text-center text-sm font-semibold text-primary-foreground"
                  >
                    Continuar en Mercado Pago ↗
                  </a>
                )}
              </form>
            ) : (
              <p className="text-sm">
                No podemos iniciar una autorización con este estado. Si necesitás ayuda, comunicate con el equipo de Bonus Bissen.
              </p>
            )}
            {pending && (
              <p className="text-sm text-foreground/65">
                La confirmación puede demorar. La consultamos automáticamente por un tiempo y cuando volvés a esta pestaña, dentro de ese período. Si
                no llega, podés volver más tarde: tu plan queda guardado.
              </p>
            )}
            <p className="text-xs leading-relaxed text-foreground/65">
              Volver de Mercado Pago no confirma la autorización. Para continuar usamos únicamente el estado verificado de tu negocio.
            </p>
          </section>
          <aside
            aria-labelledby="plan-summary-title"
            className="overflow-hidden rounded-3xl border border-zinc-700 bg-zinc-950 text-zinc-50 shadow-xl"
          >
            <div className="aspect-2/1 border-b border-zinc-800">
              <PlanArt />
            </div>
            <div className="space-y-6 p-6 sm:p-8">
              <div className="space-y-2">
                <h3 id="plan-summary-title" className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-400">
                  Tu plan
                </h3>
                <p className="wrap-break-word text-2xl font-semibold">{org.billingPlanName ?? "Todavía no elegiste un plan"}</p>
                {org.billingPlanName && <p className="text-sm text-primary">Suscripción mensual</p>}
              </div>
              <div className="space-y-3 border-t border-zinc-800 pt-5 text-sm text-zinc-300">
                <p>✓ Tu propia organización con tu marca y estilo</p>
                <p>✓ Hasta 5 locales autogestionables</p>
                <p>✓ Acceso a tu panel administrativo</p>
                <p>✓ Creación ilimitada de recompensas</p>
                <p>✓ Asignación ilimitada de empleados para gestionar cada sucursal</p>
              </div>
              <p className="text-xs leading-relaxed text-zinc-400">
                Revisá el importe y las condiciones en Mercado Pago antes de confirmar la autorización.
              </p>
            </div>
          </aside>
        </div>
      )}
      <BillingFooter disabled={disabled || busy} run={run} />
    </fieldset>
  );
}
