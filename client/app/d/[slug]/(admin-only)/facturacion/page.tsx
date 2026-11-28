"use client";

import { useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { ChevronRight, Download, Info, LoaderCircle, ReceiptText, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  type BillingInvoice,
  type BillingOrganization,
  type BillingPlan,
} from "@/lib/billing";
import { getDashboardBilling } from "./actions";
import { PlanActions } from "./plan-actions";
import { ActionResult } from "@/lib/api";
import { billingDate, formatMoney, invoiceLabel, subscriptionLabel } from "@/lib/helpers/format";
import { cn } from "@/lib/helpers/utils";

type DashboardBilling = {
  organization: ActionResult<BillingOrganization>;
  invoices: ActionResult<BillingInvoice[]>;
  plans: ActionResult<BillingPlan[]>;
};

// Shared by the column header and each row so both stay aligned on wide screens.
const INVOICE_COLUMNS = "xl:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_8.5rem_2.25rem]";

function SectionError({ message, retry }: { message: string; retry: () => void }) {
  return (
    <div className="space-y-3 rounded-xl border border-red-500/30 bg-red-500/5 p-4">
      <p role="alert" className="wrap-break-word text-sm">{message}</p>
      <Button variant="outline" onClick={retry}>Reintentar</Button>
    </div>
  );
}

function InvoiceRow({ invoice, slug }: { invoice: BillingInvoice; slug: string }) {
  const [open, setOpen] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const request = useRef<AbortController | null>(null);
  const objectUrl = useRef<string | null>(null);

  useEffect(() => () => {
    request.current?.abort();
    if (objectUrl.current) URL.revokeObjectURL(objectUrl.current);
  }, []);

  async function downloadPdf() {
    if (request.current) return;
    const controller = new AbortController();
    request.current = controller;
    setDownloading(true);
    setError(null);

    try {
      const response = await fetch(
        `/d/${encodeURIComponent(slug)}/facturacion/facturas/${encodeURIComponent(invoice.id)}/pdf`,
        { cache: "no-store", credentials: "same-origin", signal: controller.signal },
      );
      if (!response.ok) {
        throw new Error(response.status === 401 || response.status === 403
          ? "No tenés acceso a esta factura. Verificá tu sesión e intentá de nuevo."
          : "No se pudo descargar la factura. Intentá de nuevo.");
      }
      if (response.headers.get("content-type")?.split(";")[0].trim().toLowerCase() !== "application/pdf") {
        throw new Error("El servidor no devolvió un PDF válido. Intentá de nuevo.");
      }
      const blob = await response.blob();
      if (controller.signal.aborted) return;
      if (!blob.size) throw new Error("El PDF está vacío. Intentá de nuevo.");

      const url = URL.createObjectURL(blob);
      objectUrl.current = url;
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `factura-${invoice.invoiceNumber}.pdf`;
      document.body.appendChild(anchor);
      try {
        anchor.click();
      } finally {
        anchor.remove();
        // Give the browser time to start the download before releasing the URL.
        window.setTimeout(() => {
          URL.revokeObjectURL(url);
          if (objectUrl.current === url) objectUrl.current = null;
        }, 1000);
      }
    } catch (cause) {
      if (!controller.signal.aborted) {
        setError(cause instanceof Error ? cause.message : "No se pudo descargar la factura. Intentá de nuevo.");
      }
    } finally {
      if (!controller.signal.aborted) {
        request.current = null;
        setDownloading(false);
      }
    }
  }

  const detailsId = `invoice-details-${invoice.id}`;

  return (
    <li className="min-w-0 border-b border-border last:border-b-0">
      <div className={cn("grid grid-cols-[minmax(0,1fr)_auto_2.25rem] items-center gap-3 px-4 py-1.5 sm:px-5", INVOICE_COLUMNS)}>
        <button
          type="button"
          onClick={() => setOpen((current) => !current)}
          aria-expanded={open}
          aria-controls={detailsId}
          className="flex min-w-0 items-center gap-2.5 rounded-lg py-2 text-left outline-none focus-visible:ring-3 focus-visible:ring-foreground/70"
        >
          <ChevronRight className={cn("size-4 shrink-0 text-foreground/60 transition-transform duration-150 motion-reduce:transition-none", open && "rotate-90")} aria-hidden="true" />
          <span className="flex min-w-0 flex-col">
            <span className="text-sm font-semibold">Factura #{invoice.invoiceNumber}</span>
            <span className="truncate text-xs text-foreground/70">Emitida el {billingDate(invoice.createdAt)}</span>
          </span>
        </button>
        <div className="flex flex-col items-end gap-1 xl:contents">
          <span className="whitespace-nowrap text-right text-sm font-semibold tabular-nums">{formatMoney(invoice.amount, invoice.currency)}</span>
          <span className="flex flex-wrap justify-end gap-1.5 text-xs font-medium xl:justify-start">
            <span className="rounded-full bg-foreground/10 px-2.5 py-0.5">{invoiceLabel(invoice.paymentStatus)}</span>
            {invoice.overdue && <span className="rounded-full bg-red-500/10 px-2.5 py-0.5 text-red-500">Vencida</span>}
          </span>
        </div>
        <Button
          variant="outline"
          size="icon-lg"
          onClick={() => void downloadPdf()}
          disabled={downloading}
          aria-label={`${downloading ? "Descargando" : error ? "Reintentar descarga de" : "Descargar PDF de"} factura ${invoice.invoiceNumber}`}
          aria-describedby={error ? `pdf-error-${invoice.id}` : undefined}
        >
          {downloading ? <LoaderCircle className="size-4 animate-spin motion-reduce:animate-none" aria-hidden="true" /> : <Download className="size-4" aria-hidden="true" />}
        </Button>
      </div>
      {downloading && <p role="status" className="px-4 pb-3 text-xs text-foreground/70 sm:px-5">Preparando PDF de la factura #{invoice.invoiceNumber}…</p>}
      {error && <p id={`pdf-error-${invoice.id}`} role="alert" className="px-4 pb-3 text-sm text-red-500 sm:px-5">{error}</p>}
      <dl id={detailsId} hidden={!open} className={cn("mx-4 mb-3 grid-cols-1 gap-3 rounded-xl bg-foreground/5 p-3 text-sm sm:mx-5 sm:ml-11 sm:grid-cols-3", open ? "grid" : "hidden")}>
        <div>
          <dt className="text-xs text-foreground/70">Vencimiento</dt>
          <dd className="mt-0.5 font-medium">{billingDate(invoice.dueAt)}</dd>
        </div>
        <div>
          <dt className="text-xs text-foreground/70">Fecha de pago</dt>
          <dd className="mt-0.5 font-medium">{invoice.paidAt ? billingDate(invoice.paidAt) : invoice.paymentStatus === "paid" ? "Fecha no informada" : "Sin pago registrado"}</dd>
        </div>
        <div className="min-w-0">
          <dt className="text-xs text-foreground/70">Referencia de pago</dt>
          <dd className="mt-0.5 wrap-break-word font-medium">{invoice.paymentReference || "Sin referencia informada"}</dd>
        </div>
      </dl>
    </li>
  );
}

export default function FacturacionPage() {
  const { slug } = useParams<{ slug: string }>();
  const [result, setResult] = useState<DashboardBilling | null>(null);
  const [loading, setLoading] = useState(true);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let ignore = false;

    getDashboardBilling()
      .catch((): DashboardBilling => ({
        organization: { ok: false, error: "No pudimos cargar los datos de tu plan. Intentá de nuevo." },
        invoices: { ok: false, error: "No pudimos cargar el historial de facturas. Intentá de nuevo." },
        plans: { ok: false, error: "No pudimos cargar los planes disponibles." },
      }))
      .then((next) => {
        if (ignore) return;
        setResult(next);
        setLoading(false);
      });

    return () => {
      ignore = true;
    };
  }, [slug, attempt]);

  function refresh() {
    setLoading(true);
    setAttempt((current) => current + 1);
  }

  const organization = result?.organization;
  const invoices = result?.invoices;
  const sortedInvoices = invoices?.ok ? [...invoices.data].sort((a, b) => {
    const aDate = Date.parse(a.createdAt);
    const bDate = Date.parse(b.createdAt);
    return (Number.isNaN(bDate) ? 0 : bDate) - (Number.isNaN(aDate) ? 0 : aDate)
      || b.invoiceNumber - a.invoiceNumber;
  }) : [];

  const plans = result?.plans?.ok ? result.plans.data : null;

  return (
    <main className="mx-auto flex w-full flex-col text-foreground lg:h-full lg:min-h-0">
      <header className="mb-5 flex flex-wrap items-end justify-between gap-3 lg:shrink-0">
        <div>
          <p className="mb-1 text-xs font-medium text-foreground/70">Panel de administración</p>
          <h1 className="text-3xl font-semibold tracking-tighter">Facturación</h1>
          <p className="mt-1 text-sm text-foreground/80">Tu plan, el próximo vencimiento y las facturas de tu negocio.</p>
        </div>
        <Button variant="outline" size="lg" disabled={loading} onClick={refresh} data-guide="billing-refresh">
          <RefreshCw className={cn("size-4", loading && "animate-spin motion-reduce:animate-none")} aria-hidden="true" />
          {loading ? "Actualizando…" : "Actualizar"}
        </Button>
      </header>

      {loading && <p role="status" className="sr-only">Cargando información de facturación…</p>}

      <div className="grid gap-5 lg:min-h-0 lg:flex-1 lg:grid-cols-[minmax(24rem,28rem)_minmax(0,1fr)]">
        <section aria-labelledby="billing-plan-title" aria-busy={loading} data-guide="billing-plan" className="flex min-w-0 flex-col rounded-2xl border border-border bg-card p-5 lg:min-h-0 lg:overflow-y-auto">
          <h2 id="billing-plan-title" className="text-sm font-medium text-foreground/70">Tu plan</h2>
          {loading ? <p className="mt-3 text-sm text-foreground/70">Cargando plan y estado…</p> : organization?.ok ? (
            <>
              <p className="mt-2 wrap-break-word text-3xl font-semibold leading-tight tracking-tight">{organization.data.billingPlanName || "Sin plan informado"}</p>
              <dl className="mt-5 border-t border-border text-sm">
                <div className="flex justify-between gap-3 border-b border-border py-3">
                  <dt className="text-foreground/70">Próximo vencimiento</dt>
                  <dd className="text-right font-semibold">{billingDate(organization.data.nextInvoiceDueAt)}</dd>
                </div>
                <div className="flex justify-between gap-3 border-b border-border py-3">
                  <dt className="text-foreground/70">Ciclo</dt>
                  <dd className="wrap-break-word text-right font-medium">{organization.data.billingCycle === "monthly" ? "Mensual" : organization.data.billingCycle || "Sin ciclo informado"}</dd>
                </div>
                <div className="flex justify-between gap-3 border-b border-border py-3">
                  <dt className="text-foreground/70">Mercado Pago</dt>
                  <dd className="text-right font-medium">{subscriptionLabel(organization.data.mercadoPagoSubscriptionStatus)}</dd>
                </div>
                {organization.data.subscriptionEndsAt && (
                  <div className="flex justify-between gap-3 border-b border-border py-3">
                    <dt className="text-foreground/70">Acceso hasta</dt>
                    <dd className="text-right font-semibold">{billingDate(organization.data.subscriptionEndsAt)}</dd>
                  </div>
                )}
              </dl>
              {organization.data.subscriptionEndsAt && (
                <p className="mt-4 rounded-xl border border-border p-3 text-sm leading-6">
                  Cancelaste el plan. Tu equipo puede seguir usando todas las herramientas hasta el {billingDate(organization.data.subscriptionEndsAt)}; después vas a necesitar suscribirte de nuevo.
                </p>
              )}
              <div className="mt-5 flex gap-2.5 rounded-xl bg-foreground/5 p-3 text-xs leading-5 text-foreground/80">
                <Info className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
                <div className="space-y-1.5">
                  <p>La autorización de Mercado Pago permite los cobros, pero no confirma que una factura esté pagada: eso lo ves en cada factura del historial.</p>
                  <p>El próximo vencimiento corresponde a una factura, no a la renovación ni a la expiración del plan.</p>
                </div>
              </div>
              <PlanActions organization={organization.data} plans={plans} onChanged={refresh} />
            </>
          ) : <div className="mt-3"><SectionError message={organization && !organization.ok ? organization.error : "No hay información del plan disponible."} retry={refresh} /></div>}
        </section>

        <section aria-labelledby="billing-invoices-title" aria-busy={loading} data-guide="billing-invoices" className="flex min-w-0 flex-col overflow-hidden rounded-2xl border border-border bg-card lg:min-h-0">
          <div className="px-4 pb-3 pt-4 sm:px-5">
            <h2 id="billing-invoices-title" className="flex items-center gap-2 text-base font-semibold tracking-tight">
              <ReceiptText className="size-4" aria-hidden="true" /> Historial de facturas
            </h2>
            <p className="mt-0.5 text-xs text-foreground/70">De la más reciente a la más antigua, independientemente del medio de pago.</p>
          </div>
          {loading ? <p className="px-4 pb-5 text-sm text-foreground/70 sm:px-5">Cargando facturas…</p> : invoices?.ok ? (
            sortedInvoices.length ? (
              <>
                <div aria-hidden="true" className={cn("hidden gap-3 border-t border-border px-5 py-2 text-xs font-medium text-foreground/60 xl:grid", INVOICE_COLUMNS)}>
                  <span className="pl-6.5">Factura</span><span className="text-right">Importe</span><span>Estado</span><span />
                </div>
                <ul className="border-t border-border lg:min-h-0 lg:flex-1 lg:overflow-y-auto">
                  {sortedInvoices.map((invoice) => <InvoiceRow key={`${slug}:${invoice.id}`} invoice={invoice} slug={slug} />)}
                </ul>
              </>
            ) : (
              <div className="mx-4 mb-5 rounded-2xl border border-dashed border-border px-4 py-8 text-center sm:mx-5">
                <p className="font-medium">Todavía no hay facturas</p>
                <p className="mt-2 text-sm text-foreground/70">Cuando se emita una factura, vas a poder consultar sus datos y descargar el PDF acá.</p>
              </div>
            )
          ) : <div className="px-4 pb-5 sm:px-5"><SectionError message={invoices && !invoices.ok ? invoices.error : "No hay información de facturas disponible."} retry={refresh} /></div>}
        </section>
      </div>
    </main>
  );
}
