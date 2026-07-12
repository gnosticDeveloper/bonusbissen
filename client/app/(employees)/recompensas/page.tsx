import { getRewards } from "@/app/rewards.actions";
import RecompensasView from "@/components/recompensas/recompensas-view";

export default async function RecompensasPage() {
  const recompensas = await getRewards();

  return <RecompensasView initialRecompensas={recompensas} />;
}
