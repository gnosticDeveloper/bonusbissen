import { decodeJwt, getDashboardSessionToken } from "@/lib/auth/session";
import { UserRole } from "@/lib/definitions";
import { redirect } from "next/navigation";
import { Fragment } from "react/jsx-runtime";

export default async function AdminOnlyLayout({ children, params }: { params: Promise<{ slug: string }>; children: React.ReactNode }) {
  const session = await getDashboardSessionToken();

  if (!session) redirect(`/d/sign-in`);

  const { slug } = await params;
  const payload = decodeJwt(session);

  if (payload.role !== UserRole.ADMIN) redirect(`/d/${slug}/inicio`);

  return <Fragment>{children}</Fragment>;
}
