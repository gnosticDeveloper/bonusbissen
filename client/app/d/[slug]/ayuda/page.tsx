import { cookies } from "next/headers";
import { HelpCenter } from "@/components/guides/help-center";
import { requireDashboardSession } from "@/lib/auth/session";
import { GUIDES_COOKIE_NAME, guidesEnabledFrom } from "@/lib/preferences/guides";

export default async function HelpPage({ params }: { params: Promise<{ slug: string }> }) {
  const [{ slug }, session, cookieStore] = await Promise.all([params, requireDashboardSession(), cookies()]);
  return <HelpCenter slug={slug} role={session.role} guidesEnabled={guidesEnabledFrom(cookieStore.get(GUIDES_COOKIE_NAME)?.value)} />;
}
