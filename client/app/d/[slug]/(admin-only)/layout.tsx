import { getDashboardSessionToken, verifySession } from "@/lib/auth/session";
import { UserRole } from "@/lib/definitions";
import { redirect } from "next/navigation";
import { Fragment } from "react/jsx-runtime";

export default async function AdminOnlyLayout({ children, params }: { params: Promise<{ slug: string }>; children: React.ReactNode }) {
  const session = await getDashboardSessionToken();

  if (!session) redirect(`/d/sign-in`);

  const { slug } = await params;
  const payload = await verifySession(session, "dashboard");
  if (!payload) redirect("/d/sign-in");
  if (payload.role !== UserRole.ADMIN) redirect(`/d/${slug}/inicio`);

  return <Fragment>{children}</Fragment>;
}
