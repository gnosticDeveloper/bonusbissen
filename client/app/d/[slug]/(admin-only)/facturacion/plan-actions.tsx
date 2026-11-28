"use client";

import { useId, useRef, useState } from "react";
import { TriangleAlert } from "lucide-react";
import { useModal } from "@/components/modal";
import { Button } from "@/components/ui/button";
import type { BillingOrganization, BillingPlan } from "@/lib/billing";
import { billingDate, formatMoney } from "@/lib/helpers/format";
import { canCancelSubscription, canChangePlan, upgradePlans } from "@/lib/helpers/billing-plan";
import { cn } from "@/lib/helpers/utils";
import { cancelBillingSubscription, upgradeBillingPlan } from "./actions";

type PlanActionsProps = {
  organization: BillingOrganization;
  /** Null when the plan list could not be read: upgrades are then simply not offered. */
  plans: BillingPlan[] | null;
  onChanged: () => void;
};

export function PlanActions({ organization, plans, onChanged }: PlanActionsProps) {
  const { open } = useModal();
  const upgrades = plans ? upgradePlans(plans, organization.billingPlanName) : [];
  const changeAllowed = canChangePlan(organization);
  const cancelAllowed = canCancelSubscription(organization);
  const hintId = useId();

  const hint = organization.subscriptionEndsAt
    ? null
    : !changeAllowed && upgrades.length > 0
      ? "Para mejorar el plan necesitás tener los cobros autorizados en Mercado Pago."
      : null;

  return (
    <div className="mt-auto flex flex-col gap-2 pt-5">
      {upgrades.length > 0 && (
        <Button
          size="lg"
          className="h-11 text-sm font-semibold"
          disabled={!changeAllowed}
          aria-describedby={hint ? hintId : undefined}
          onClick={() =>
            open(<UpgradePlanDialog organization={organization} upgrades={upgrades} onChanged={onChanged} />, {
              title: "Mejorar plan",
              description: `El nuevo precio se cobra desde la factura con vencimiento el ${billingDate(organization.nextInvoiceDueAt)}.`,
            })
          }
        >
          Mejorar plan
        </Button>
      )}
      {hint && <p id={hintId} className="text-xs text-foreground/70">{hint}</p>}
      {!organization.subscriptionEndsAt && (
        <Button
          variant="ghost"
          size="lg"
          className="h-10 text-red-600 hover:bg-red-500/10 dark:text-red-400"
          disabled={!cancelAllowed}
          onClick={() =>
            open(<CancelPlanConfirm organization={organization} onChanged={onChanged} />, {
              title: "Cancelar plan",
              description: "Dejás de pagar, pero conservás el acceso hasta el final del período ya pagado.",
            })
          }
        >
          Cancelar plan
        </Button>
      )}
    </div>
  );
}

function UpgradePlanDialog({ organization, upgrades, onChanged }: { organization: BillingOrganization; upgrades: BillingPlan[]; onChanged: () => void }) {
  const { close, runWithStatus } = useModal();
  const [selected, setSelected] = useState(upgrades[0]?.id ?? "");
  const submitting = useRef(false);
  const name = useId();

  async function confirm() {
    if (submitting.current || !selected) return;
    submitting.current = true;
    const plan = upgrades.find((item) => item.id === selected);
    await runWithStatus(() => upgradeBillingPlan(organization.id, selected), {
      loading: { title: "Cambiando de plan", description: "Estamos actualizando tu plan y el monto en Mercado Pago." },
      success: (data) => ({
        title: "Plan actualizado",
        description: `Tu plan ahora es ${data.billingPlanName ?? plan?.name}. El nuevo precio se cobra desde la próxima factura.`,
      }),
      errorTitle: "No pudimos cambiar el plan",
    });
    // Refresh either way: a lost response may still have changed the plan upstream.
    onChanged();
  }

  return (
    <div className="flex flex-col gap-5">
      <fieldset className="flex flex-col gap-2">
        <legend className="mb-2 text-sm font-medium text-foreground/80">Elegí tu nuevo plan</legend>
        {upgrades.map((plan) => (
          <label
            key={plan.id}
            className={cn(
              "flex cursor-pointer items-center justify-between gap-3 rounded-xl border p-3 text-sm transition-colors has-focus-visible:ring-3 has-focus-visible:ring-foreground/70 motion-reduce:transition-none",
              selected === plan.id ? "border-primary bg-primary/10" : "border-border hover:bg-foreground/5",
            )}
          >
            <span className="flex items-center gap-3">
              <input
                type="radio"
                name={name}
                value={plan.id}
                checked={selected === plan.id}
                onChange={() => setSelected(plan.id)}
                className="size-4 accent-primary"
              />
              <span className="font-semibold">{plan.name}</span>
            </span>
            <span className="tabular-nums">{formatMoney(plan.price, plan.currency)} <span className="text-foreground/70">/ mes</span></span>
          </label>
        ))}
      </fieldset>
      <div className="flex flex-wrap justify-end gap-2">
        <Button variant="outline" size="lg" onClick={close}>Volver</Button>
        <Button size="lg" onClick={() => void confirm()} disabled={!selected}>Cambiar de plan</Button>
      </div>
    </div>
  );
}

function CancelPlanConfirm({ organization, onChanged }: { organization: BillingOrganization; onChanged: () => void }) {
  const { close, runWithStatus } = useModal();
  const submitting = useRef(false);

  async function confirm() {
    if (submitting.current) return;
    submitting.current = true;
    await runWithStatus(() => cancelBillingSubscription(organization.id), {
      loading: { title: "Cancelando el plan", description: "Estamos cancelando los cobros en Mercado Pago." },
      success: (data) => ({
        title: "Plan cancelado",
        description: data.subscriptionEndsAt
          ? `No se emitirán más facturas. Podés seguir usando Bonus Bissen hasta el ${billingDate(data.subscriptionEndsAt)}.`
          : "Cancelamos los cobros en Mercado Pago. No se emitirán más facturas.",
      }),
      errorTitle: "No pudimos cancelar el plan",
    });
    // Refresh either way: a lost response may still have cancelled upstream.
    onChanged();
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-start gap-3 rounded-xl border border-red-500/30 bg-red-500/10 p-4">
        <TriangleAlert className="size-5 shrink-0 text-foreground" aria-hidden="true" />
        <div className="space-y-2 text-sm leading-relaxed">
          <p>
            ¿Querés cancelar el plan <strong>{organization.billingPlanName ?? "actual"}</strong>? Mercado Pago deja de cobrar y no se emiten más facturas.
          </p>
          <p>Tu equipo puede seguir usando todas las herramientas hasta que termine el período ya pagado. Las facturas pendientes siguen pudiendo pagarse.</p>
        </div>
      </div>
      <div className="flex flex-wrap justify-end gap-2">
        <Button variant="outline" size="lg" onClick={close}>Mantener mi plan</Button>
        <Button variant="destructive" size="lg" onClick={() => void confirm()}>Cancelar plan</Button>
      </div>
    </div>
  );
}
