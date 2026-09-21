import { redirect } from "next/navigation";
import { getMembership } from "@/app/s/[slug]/actions";
import { SideMenu } from "@/components/side-menu";
import { BottomNav } from "@/components/bottom-nav";

export default async function MemberOnlyLayout({ children, params }: { children: React.ReactNode; params: Promise<{ slug: string }> }) {
  const { slug: storefrontId } = await params;

  const isMember = await getMembership(storefrontId);

  // The opposite validation of "afiliarse". If users are not afiliated to a local business, we can redirect them to the /afiliarse page.
  if (!isMember) redirect(`/s/${storefrontId}/afiliarse`);

  return (
    <div className="min-h-[calc(100svh-4.375rem)] bg-background pb-26">
      {children}
      <SideMenu />
      <BottomNav />
    </div>
  );
}
