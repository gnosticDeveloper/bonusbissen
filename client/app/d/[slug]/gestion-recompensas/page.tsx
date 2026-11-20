import { getRewards } from "./actions";
import { getCurrentUser } from "../actions";
import { UserRole } from "@/lib/types/user";
import { cookies } from "next/headers";
import { RewardsView } from "@/components/rewards-view";
import { REWARD_VIEW_COOKIE_NAME, rewardViewFrom } from "@/lib/preferences/reward-view";

export default async function RewardsPage({ searchParams }: { searchParams: Promise<{ [key: string]: string | undefined }> }) {
  const { query, page: pageParam } = await searchParams;
  const page = Math.max(0, Number(pageParam) || 0);
  const cookieStore = await cookies();
  const view = rewardViewFrom(cookieStore.get(REWARD_VIEW_COOKIE_NAME)?.value);

  const [rewardsResult, currentUser] = await Promise.all([getRewards(query, { page }), getCurrentUser()]);

  const isAdmin = currentUser.ok && currentUser.data.role.toUpperCase() === UserRole.ADMIN;
  const rewards = rewardsResult.ok ? rewardsResult.data.items : [];
  const totalPages = rewardsResult.ok ? rewardsResult.data.totalPages : 0;

  return <RewardsView isAdmin={isAdmin} initialView={view} page={page} totalPages={totalPages} rewards={rewards} />;
}
