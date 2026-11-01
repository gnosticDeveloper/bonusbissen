"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { Download, LoaderCircle, ReceiptText, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  billingDate,
  billingMoney,
  invoiceLabel,
  subscriptionLabel,
  type BillingInvoice,
  type BillingOrganization,
  type BillingResult,
} from "@/lib/billing";
import { getDashboardBilling } from "./actions";

type DashboardBilling = {
  organization: BillingResult<BillingOrganization>;
  invoices: BillingResult<BillingInvoice[]>;
};

function SectionError({ message, retry }: { message: string; retry: () => void }) {
  return (
    <div className="space-y-3 rounded-xl border border-red-500/30 bg-red-500/5 p-4">
      <p role="alert" className="wrap-break-word text-sm">{message}</p>
      <Button variant="outline" onClick={retry}>Reintentar</Button>
    </div>
  );
}

function InvoiceCard({ invoice, slug }: { invoice: BillingInvoice; slug: string }) {
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

  return (
    <li className="min-w-0 rounded-2xl border border-border bg-background p-4 sm:p-5">
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
          <dd className="mt-1 wrap-break-word font-semibold">{billingMoney(invoice.amount, invoice.currency)} <span className="font-normal">({invoice.currency})</span></dd>
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
          aria-label={`${downloading ? "Descargando" : error ? "Reintentar descarga de" : "Descargar PDF de"} factura ${invoice.invoiceNumber}`}
          aria-describedby={error ? `pdf-error-${invoice.id}` : undefined}
        >
          {downloading ? <LoaderCircle className="size-4 animate-spin motion-reduce:animate-none" aria-hidden="true" /> : <Download className="size-4" aria-hidden="true" />}
          {downloading ? "Descargando…" : error ? "Reintentar PDF" : "Descargar PDF"}
        </Button>
        {downloading && <p role="status" className="text-xs text-foreground/70">Preparando PDF de la factura #{invoice.invoiceNumber}…</p>}
        {error && <p id={`pdf-error-${invoice.id}`} role="alert" className="text-sm text-red-500">{error}</p>}
      </div>
    </li>
  );
}

export default function FacturacionPage() {
  const { slug } = useParams<{ slug: string }>();
  const [result, setResult] = useState<DashboardBilling | null>(null);
  const [loading, setLoading] = useState(true);
  const requestId = useRef(0);

  const load = useCallback(async () => {
    const id = ++requestId.current;
    setLoading(true);
    try {
      const next = await getDashboardBilling();
      if (id === requestId.current) setResult(next);
    } catch {
      if (id === requestId.current) {
        setResult({
          organization: { ok: false, error: "No pudimos cargar los datos de tu plan. Intentá de nuevo." },
          invoices: { ok: false, error: "No pudimos cargar el historial de facturas. Intentá de nuevo." },
        });
      }
    } finally {
      if (id === requestId.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
    return () => { requestId.current += 1; };
  }, [load, slug]);

  const organization = result?.organization;
  const invoices = result?.invoices;
  const sortedInvoices = invoices?.ok ? [...invoices.data].sort((a, b) => {
    const aDate = Date.parse(a.createdAt);
    const bDate = Date.parse(b.createdAt);
    return (Number.isNaN(bDate) ? 0 : bDate) - (Number.isNaN(aDate) ? 0 : aDate)
      || b.invoiceNumber - a.invoiceNumber;
  }) : [];

  return (
    <main className="mx-auto min-h-full w-full max-w-3xl text-foreground">
      <header className="mb-7">
        <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.18em]">Panel de administración</p>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-3xl font-semibold tracking-tighter sm:text-4xl">Facturación</h1>
          <Button variant="outline" disabled={loading} onClick={() => void load()}>
            <RefreshCw className={`size-4 ${loading ? "animate-spin motion-reduce:animate-none" : ""}`} aria-hidden="true" />
            {loading ? "Actualizando…" : "Actualizar"}
          </Button>
        </div>
        <p className="mt-2 text-sm leading-6 text-foreground/80">Consultá tu plan, el próximo vencimiento y el historial de facturas de tu negocio.</p>
      </header>

      {loading && <p role="status" className="mb-5 text-sm text-foreground/80">Cargando información de facturación…</p>}

      <div className="space-y-6">
        <section aria-labelledby="billing-plan-title" aria-busy={loading} className="rounded-3xl border border-border bg-card p-5 sm:p-6">
          <h2 id="billing-plan-title" className="text-lg font-semibold tracking-tight">Tu plan</h2>
          <div className="mt-4">
            {loading ? <p className="text-sm text-foreground/70">Cargando plan y estado…</p> : organization?.ok ? (
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
                  <p>El estado de Mercado Pago indica la autorización de cobros; no confirma que una factura esté pagada. Consultá el estado de cada factura en el historial.</p>
                  <p>El próximo vencimiento corresponde a una factura, no a la renovación ni a la expiración del plan. El sistema no expone una fecha de renovación o expiración.</p>
                </div>
              </>
            ) : <SectionError message={organization && !organization.ok ? organization.error : "No hay información del plan disponible."} retry={() => void load()} />}
          </div>
        </section>

        <section aria-labelledby="billing-invoices-title" aria-busy={loading} className="rounded-3xl border border-border bg-card p-5 sm:p-6">
          <h2 id="billing-invoices-title" className="flex items-center gap-2 text-lg font-semibold tracking-tight">
            <ReceiptText className="size-5" aria-hidden="true" /> Historial de facturas
          </h2>
          <p className="mt-2 text-sm leading-6 text-foreground/80">De la más reciente a la más antigua, independientemente del medio de pago utilizado.</p>
          <div className="mt-5">
            {loading ? <p className="text-sm text-foreground/70">Cargando facturas…</p> : invoices?.ok ? (
              sortedInvoices.length ? (
                <ul className="space-y-4">
                  {sortedInvoices.map((invoice) => <InvoiceCard key={`${slug}:${invoice.id}`} invoice={invoice} slug={slug} />)}
                </ul>
              ) : (
                <div className="rounded-2xl border border-dashed border-border px-4 py-8 text-center">
                  <p className="font-medium">Todavía no hay facturas</p>
                  <p className="mt-2 text-sm text-foreground/70">Cuando se emita una factura, vas a poder consultar sus datos y descargar el PDF acá.</p>
                </div>
              )
            ) : <SectionError message={invoices && !invoices.ok ? invoices.error : "No hay información de facturas disponible."} retry={() => void load()} />}
          </div>
        </section>
      </div>
    </main>
  );
}
