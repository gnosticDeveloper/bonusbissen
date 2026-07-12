import CustomerView from "@/components/mis-puntos/customer-view";
import { getRewards } from "@/app/rewards.actions";

export default async function MisPuntosPage() {
  const rewards = await getRewards();
  return <CustomerView rewards={rewards} />;
}
