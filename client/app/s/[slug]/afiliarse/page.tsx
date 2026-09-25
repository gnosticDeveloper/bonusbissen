import { redirect } from "next/navigation";
import { getStorefrontDiscoverInfo } from "@/app/s/[slug]/afiliarse/actions";
import { getMembership } from "@/app/s/[slug]/actions";
import { AfiliarseView } from "@/components/afiliarse-view";
import { getSessionToken, isSessionValid } from "@/lib/auth/session";

export default async function AfiliarsePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug: storefrontId } = await params;

  const session = await getSessionToken();
  let isLoggedIn = false;

  if (session) {
    if (!isSessionValid(session)) {
      // Hubo sesión real y venció: no lo tratamos como usuario nuevo.
      // Vuelve acá mismo después de loguearse.
      redirect(`/sign-in?returnTo=/s/${storefrontId}/afiliarse`);
    }

    isLoggedIn = true;
    const isMember = await getMembership(storefrontId);
    if (isMember) redirect(`/s/${storefrontId}/inicio`);
  }

  const storefront = await getStorefrontDiscoverInfo(storefrontId);

  return <AfiliarseView storefront={storefront} isLoggedIn={isLoggedIn} />;
}
