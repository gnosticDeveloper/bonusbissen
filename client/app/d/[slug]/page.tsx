import { redirect } from "next/navigation";

export default async function RootDashboardSlugPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  redirect(`/d/${slug}/inicio`);
}
