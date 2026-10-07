import { getRewards } from "./actions";
import { getCurrentUser } from "../actions";
import { UserRole } from "@/lib/definitions";
import { resolveAssetUrl } from "@/lib/helpers/assets";
import { cookies } from "next/headers";
import { RewardsView } from "@/components/rewards-view";

export default async function RewardsPage({ searchParams }: { searchParams: Promise<{ [key: string]: string | undefined }> }) {
  const { query, page: pageParam } = await searchParams;
  const page = Math.max(0, Number(pageParam) || 0);
  const cookieStore = await cookies();
  const view = cookieStore.get("reward-view")?.value === "list" ? "list" : "grid";

  const [rewardsResult, currentUser] = await Promise.all([getRewards(query, { page }), getCurrentUser()]);

  const isAdmin = currentUser.ok && currentUser.data.role.toUpperCase() === UserRole.ADMIN;
  const rewards = rewardsResult.ok ? rewardsResult.data.items : [];
  const totalPages = rewardsResult.ok ? rewardsResult.data.totalPages : 0;

  const transformedRewards = rewards.map((reward) => ({
    ...reward,
    imagePath: reward.imagePath ? resolveAssetUrl(reward.imagePath) : null,
  }));

  return <RewardsView initialView={view} isAdmin={isAdmin} page={page} rewards={transformedRewards} totalPages={totalPages} />;
}
