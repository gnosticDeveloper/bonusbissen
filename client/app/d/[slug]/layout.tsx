import { redirect } from "next/navigation";

export default async function DashboardRootLayout({ params, children }: { params: Promise<{ slug: string }>; children: React.ReactNode }) {
  const { slug } = await params;

  const canAccess = await canUserAccessDashboard(slug);

  if (!canAccess) redirect(`/d/${slug}/inicio`);

  return children;
}
