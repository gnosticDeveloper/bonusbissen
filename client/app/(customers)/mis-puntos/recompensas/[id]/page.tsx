import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import RewardDetails from "@/components/mis-puntos/reward-details";
import { getReward } from "@/app/rewards.actions";
import { resolveCustomerIdFromSession } from "@/lib/session";
import { getCustomerById } from "@/app/(customers)/actions";

export default async function RecompensaDetallePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const customerId = await resolveCustomerIdFromSession();

  // TODO: This should redirect to login if no customerId is found
  if (!customerId) notFound();

  const [reward, customer] = await Promise.all([getReward(id), getCustomerById(customerId)]);

  if (!reward) notFound();

  // Chequeo defensivo: si alguien llega acá por URL directa a una
  // recompensa que no tiene puntos suficientes, no debería poder canjear
  // igual solo porque esta página no valida nada del lado del cliente.
  const canAfford = reward.costPoints <= customer.points;

  return (
    <div className="min-h-screen px-5 py-8 flex flex-col items-center">
      <div className="w-full max-w-md flex flex-col gap-6">
        <Link href="/mis-puntos" className="flex items-center gap-2 text-lg text-ink-soft hover:text-ink transition-colors self-start">
          <ArrowLeft className="h-5 w-5" />
          Volver
        </Link>

        <RewardDetails reward={reward} canAfford={canAfford} customerId={customerId} />
      </div>
    </div>
  );
}
