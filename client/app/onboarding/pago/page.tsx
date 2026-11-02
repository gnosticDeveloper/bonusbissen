import Link from "next/link";
import { PaymentScreen } from "./payment-button";

export default function PaymentPage() {
  return (
    <section className="space-y-6 rounded-2xl border border-border bg-card p-6 sm:p-8">
      <h1 className="text-3xl font-bold">Pagos de tu negocio</h1>
      <p>Autorizá los cobros de tu plan mensual con Mercado Pago y seguí configurando tu negocio.</p>
      <p>
        <Link className="underline" href="/onboarding?ingresar=1">
          Volver a ingresar a mi negocio
        </Link>
      </p>
      <PaymentScreen />
    </section>
  );
}
