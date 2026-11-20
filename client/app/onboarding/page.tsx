import { loadOnboarding } from "./state";
import { Onboarding } from "./onboarding";

export default async function OnboardingPage({ searchParams }: {
  searchParams: Promise<{ ingresar?: string | string[] }>;
}) {
  const recoverAccount = (await searchParams).ingresar === "1";
  return <Onboarding key={String(recoverAccount)} initial={await loadOnboarding()} recoverAccount={recoverAccount} />;
}
