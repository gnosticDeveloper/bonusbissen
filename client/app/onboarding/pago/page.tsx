import { simulatePayment } from "./actions";
import { PaymentButton } from "./payment-button";

export default function PaymentPage() {
  return <section className="space-y-6 rounded-2xl border border-border bg-card p-6 sm:p-8">
    <p className="text-sm font-semibold text-primary">Modo demostración</p>
    <h1 className="text-3xl font-bold">Empecemos con tu negocio</h1>
    <p>Después de este paso vas a crear tu organización, sumar una sucursal y configurar su programa de puntos.</p>
    <p className="rounded-xl border border-border p-4 text-sm">Este pago es una simulación. No te vamos a cobrar ni a pedir datos de tarjeta. La confirmación no acredita un pago real ni habilita permisos de administración.</p>
    <form action={simulatePayment}><PaymentButton /></form>
  </section>;
}
