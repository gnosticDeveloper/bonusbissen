import { requireDashboardSession } from "@/lib/auth/session";
import { UserRole } from "@/lib/definitions";
import { redirect } from "next/navigation";

export default async function AdminOnlyLayout({ children, params }: { params: Promise<{ slug: string }>; children: React.ReactNode }) {
  const payload = await requireDashboardSession();
  if (payload.role !== UserRole.ADMIN) {
    const { slug } = await params;
    redirect(`/d/${slug}/inicio`);
  }

  return children;
}
