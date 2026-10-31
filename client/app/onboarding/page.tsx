import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { loadOnboarding, PAYMENT_COOKIE } from "./state";
import { Onboarding } from "./onboarding";

export default async function OnboardingPage() {
  // A UX checkpoint only: authorization is always enforced independently by the backend.
  if (!(await cookies()).has(PAYMENT_COOKIE)) redirect("/onboarding/pago");
  return <Onboarding initial={await loadOnboarding()} />;
}
