import { loadOnboarding } from "./state";
import { Onboarding } from "./onboarding";

export default async function OnboardingPage() {

  return <Onboarding initial={await loadOnboarding()} />;
}
