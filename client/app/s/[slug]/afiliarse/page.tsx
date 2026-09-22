import { redirect } from "next/navigation";
import { getStorefrontDiscoverInfo } from "@/app/s/[slug]/afiliarse/actions";
import { getMembership } from "@/app/s/[slug]/actions";
import { AfiliarseView } from "@/components/afiliarse-view";

export default async function AfiliarsePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug: storefrontId } = await params;

  const [isMember, storefront] = await Promise.all([getMembership(storefrontId), getStorefrontDiscoverInfo(storefrontId)]);

  if (isMember) redirect(`/s/${storefrontId}/inicio`);

  return <AfiliarseView storefront={storefront} />;
}
