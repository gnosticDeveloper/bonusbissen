"use client";

import { useState } from "react";
import { Download, LoaderCircle, ReceiptText, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageTour } from "@/components/page-tour";
import { getDashboardBilling } from "@/lib/demo/actions";
import { useAsyncData } from "@/lib/demo/hooks";
import type { BillingInvoice } from "@/lib/demo/types";
import { billingDate, invoiceLabel, subscriptionLabel } from "@/lib/helpers/format";
import { buildInvoicePdf } from "@/lib/helpers/invoice-pdf";

function SectionError({ message, retry }: { message: string; retry: () => void }) {
  return (
    <div className="space-y-3 rounded-xl border border-red-500/30 bg-red-500/5 p-4">
      <p role="alert" className="wrap-break-word text-sm">
        {message}
      </p>
      <Button variant="outline" onClick={retry}>
        Reintentar
      </Button>
    </div>
  );
}

function InvoiceCard({ invoice, orgName, planName, tour }: { invoice: BillingInvoice; orgName: string; planName: string; tour?: boolean }) {
  const [downloading, setDownloading] = useState(false);

  async function downloadPdf() {
    if (downloading) return;
    setDownloading(true);
    await new Promise((resolve) => setTimeout(resolve, 500));
    const blob = buildInvoicePdf([
      { text: "Bonus Bissen", size: 20, bold: true },
      { text: `Factura #${invoice.invoiceNumber}`, size: 14, bold: true, gap: 18 },
      { text: `Negocio: ${orgName}`, gap: 18 },
      { text: `Plan: ${planName} (mensual)` },
      { text: `Emitida el ${billingDate(invoice.createdAt)}` },
      { text: `Vencimiento: ${billingDate(invoice.dueAt)}` },
      { text: `Estado: ${invoiceLabel(invoice.paymentStatus)}` },
      { text: `Fecha de pago: ${invoice.paidAt ? billingDate(invoice.paidAt) : "Sin pago registrado"}` },
      { text: `Referencia de pago: ${invoice.paymentReference || "Sin referencia informada"}` },
      { text: "Importe: no se muestra en la demo.", gap: 18 },
      { text: "Documento de ejemplo generado por la demo de Bonus Bissen. No es una factura electrónica AFIP.", size: 9, gap: 30 },
    ]);
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `factura-${invoice.invoiceNumber}.pdf`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    setDownloading(false);
  }

  return (
    <li className="min-w-0 rounded-2xl border border-border bg-background p-4 sm:p-5" data-tour={tour ? "invoice" : undefined}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="font-semibold">Factura #{invoice.invoiceNumber}</h3>
          <p className="mt-1 text-sm text-foreground/80">Emitida el {billingDate(invoice.createdAt)}</p>
        </div>
        <div className="flex flex-wrap gap-2 text-xs font-medium">
          <span className="rounded-full bg-foreground/10 px-3 py-1">{invoiceLabel(invoice.paymentStatus)}</span>
          {invoice.overdue && <span className="rounded-full bg-red-500/10 px-3 py-1 text-red-500">Vencida</span>}
        </div>
      </div>
      <dl className="mt-5 grid grid-cols-1 gap-4 text-sm sm:grid-cols-2">
        <div>
          <dt className="text-foreground/70">Importe</dt>
          <dd className="mt-1 wrap-break-word text-foreground/70">No se muestra en la demo</dd>
        </div>
        <div>
          <dt className="text-foreground/70">Vencimiento</dt>
          <dd className="mt-1">{billingDate(invoice.dueAt)}</dd>
        </div>
        <div>
          <dt className="text-foreground/70">Fecha de pago</dt>
          <dd className="mt-1">{invoice.paidAt ? billingDate(invoice.paidAt) : invoice.paymentStatus === "paid" ? "Fecha no informada" : "Sin pago registrado"}</dd>
        </div>
        <div className="min-w-0">
          <dt className="text-foreground/70">Referencia de pago</dt>
          <dd className="mt-1 wrap-break-word">{invoice.paymentReference || "Sin referencia informada"}</dd>
        </div>
      </dl>
      <div className="mt-5 space-y-2">
        <Button
          variant="outline"
          onClick={() => void downloadPdf()}
          disabled={downloading}
          aria-label={`${downloading ? "Descargando" : "Descargar PDF de"} factura ${invoice.invoiceNumber}`}
        >
          {downloading ? <LoaderCircle className="size-4 animate-spin motion-reduce:animate-none" aria-hidden="true" /> : <Download className="size-4" aria-hidden="true" />}
          {downloading ? "Descargando…" : "Descargar PDF"}
        </Button>
        {downloading && (
          <p role="status" className="text-xs text-foreground/70">
            Preparando PDF de la factura #{invoice.invoiceNumber}…
          </p>
        )}
      </div>
    </li>
  );
}

export default function FacturacionPage() {
  const { result, retry } = useAsyncData(async () => ({ ok: true as const, data: await getDashboardBilling() }), []);
  const loading = result === null;
  const billing = result?.ok ? result.data : null;
  const organization = billing?.organization;
  const invoices = billing?.invoices;
  const sortedInvoices = invoices?.ok ? [...invoices.data].sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt) || b.invoiceNumber - a.invoiceNumber) : [];

  return (
    <main className="mx-auto min-h-full w-full max-w-3xl text-foreground">
      <header className="mb-7">
        <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.18em]">Panel de administración</p>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-3xl font-semibold tracking-tighter sm:text-4xl">Facturación</h1>
          <Button variant="outline" disabled={loading} onClick={retry}>
            <RefreshCw className={`size-4 ${loading ? "animate-spin motion-reduce:animate-none" : ""}`} aria-hidden="true" />
            {loading ? "Actualizando…" : "Actualizar"}
          </Button>
        </div>
        <p className="mt-2 text-sm leading-6 text-foreground/80">Consultá tu plan, el próximo vencimiento y el historial de facturas de tu negocio.</p>
      </header>

      {loading && (
        <p role="status" className="mb-5 text-sm text-foreground/80">
          Cargando información de facturación…
        </p>
      )}

      <div className="space-y-6">
        <section aria-labelledby="billing-plan-title" aria-busy={loading} className="rounded-3xl border border-border bg-card p-5 sm:p-6" data-tour="billing-plan">
          <h2 id="billing-plan-title" className="text-lg font-semibold tracking-tight">
            Tu plan
          </h2>
          <div className="mt-4">
            {loading ? (
              <p className="text-sm text-foreground/70">Cargando plan y estado…</p>
            ) : organization?.ok ? (
              <>
                <dl className="grid gap-5 text-sm sm:grid-cols-2">
                  <div>
                    <dt className="text-foreground/70">Plan actual</dt>
                    <dd className="mt-1 wrap-break-word font-semibold">{organization.data.billingPlanName || "Sin plan informado"}</dd>
                  </div>
                  <div>
                    <dt className="text-foreground/70">Ciclo de facturación</dt>
                    <dd className="mt-1 wrap-break-word">{organization.data.billingCycle === "monthly" ? "Mensual" : organization.data.billingCycle || "Sin ciclo informado"}</dd>
                  </div>
                  <div>
                    <dt className="text-foreground/70">Estado de autorización en Mercado Pago</dt>
                    <dd className="mt-1">{subscriptionLabel(organization.data.mercadoPagoSubscriptionStatus)}</dd>
                  </div>
                  <div>
                    <dt className="text-foreground/70">Próximo vencimiento de factura</dt>
                    <dd className="mt-1 font-semibold">{billingDate(organization.data.nextInvoiceDueAt)}</dd>
                  </div>
                </dl>
                <div className="mt-5 space-y-2 rounded-xl bg-foreground/5 p-4 text-sm leading-6 text-foreground/80">
                  <p>
                    El estado de Mercado Pago indica la autorización de cobros; no confirma que una factura esté pagada. Consultá el estado de cada factura en el
                    historial.
                  </p>
                  <p>
                    El próximo vencimiento corresponde a una factura, no a la renovación ni a la expiración del plan. El sistema no expone una fecha de renovación o
                    expiración.
                  </p>
                </div>
              </>
            ) : (
              <SectionError message={organization && !organization.ok ? organization.error : "No hay información del plan disponible."} retry={retry} />
            )}
          </div>
        </section>

        <section aria-labelledby="billing-invoices-title" aria-busy={loading} className="rounded-3xl border border-border bg-card p-5 sm:p-6">
          <h2 id="billing-invoices-title" className="flex items-center gap-2 text-lg font-semibold tracking-tight">
            <ReceiptText className="size-5" aria-hidden="true" /> Historial de facturas
          </h2>
          <p className="mt-2 text-sm leading-6 text-foreground/80">De la más reciente a la más antigua, independientemente del medio de pago utilizado.</p>
          <div className="mt-5">
            {loading ? (
              <p className="text-sm text-foreground/70">Cargando facturas…</p>
            ) : invoices?.ok ? (
              sortedInvoices.length ? (
                <ul className="space-y-4">
                  {sortedInvoices.map((invoice, index) => (
                    <InvoiceCard
                      key={invoice.id}
                      invoice={invoice}
                      orgName={organization?.ok ? organization.data.name : "Tu negocio"}
                      planName={organization?.ok ? (organization.data.billingPlanName ?? "Plan") : "Plan"}
                      tour={index === 0}
                    />
                  ))}
                </ul>
              ) : (
                <div className="rounded-2xl border border-dashed border-border px-4 py-8 text-center">
                  <p className="font-medium">Todavía no hay facturas</p>
                  <p className="mt-2 text-sm text-foreground/70">Cuando se emita una factura, vas a poder consultar sus datos y descargar el PDF acá.</p>
                </div>
              )
            ) : (
              <SectionError message={invoices && !invoices.ok ? invoices.error : "No hay información de facturas disponible."} retry={retry} />
            )}
          </div>
        </section>
      </div>

      <PageTour
        id="panel-billing"
        ready={!loading}
        steps={[
          {
            target: "billing-plan",
            title: "Tu plan y sus vencimientos",
            body: (
              <p>
                Acá ves el plan contratado, el estado de la autorización de cobro en Mercado Pago y cuándo vence la próxima factura. Los datos de esta página
                son de ejemplo y no muestran precios.
              </p>
            ),
          },
          {
            target: "invoice",
            title: "Historial de facturas",
            body: <p>Cada factura muestra su estado y su referencia de pago. Podés descargar un PDF de ejemplo para ver cómo es el comprobante.</p>,
          },
        ]}
      />
    </main>
  );
}
