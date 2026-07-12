import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import RecompensaDetalle from "@/components/mis-puntos/recompensa-detalle";
import { getReward } from "@/app/rewards.actions";
import { getCustomerInfoByPhone } from "@/app/customers.actions";

export default async function RecompensaDetallePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const reward = await getReward(id);
  const data = await getCustomerInfoByPhone("");

  if (!reward) notFound();

  // Chequeo defensivo: si alguien llega acá por URL directa a una
  // recompensa que no tiene puntos suficientes, no debería poder canjear
  // igual solo porque esta página no valida nada del lado del cliente.
  const canAfford = reward.costPoints <= data.points;

  return (
    <div className="min-h-screen px-5 py-8 flex flex-col items-center">
      <div className="w-full max-w-md flex flex-col gap-6">
        <Link href="/mis-puntos" className="flex items-center gap-2 text-lg text-ink-soft hover:text-ink transition-colors self-start">
          <ArrowLeft className="h-5 w-5" />
          Volver
        </Link>

        <RecompensaDetalle recompensa={reward} puedeCanjear={canAfford} />
      </div>
    </div>
  );
}
