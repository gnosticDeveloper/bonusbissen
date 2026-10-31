import { redirect } from "next/navigation";

// The backend's default Mercado Pago return URL. Query parameters are not
// payment evidence: the destination reloads the authenticated backend state.
export default function BillingReturnPage() {
  redirect("/onboarding/pago");
}
