import "server-only";

import { dashboardRequest, type ActionResult } from "@/lib/api";
import { checkSession, getDashboardSessionToken } from "@/lib/auth/session";
import { selectStorefront } from "@/app/d/sign-in/actions";

type Staff = {
  id: string;
  userId: string;
  role: string;
  active: boolean;
  storefronts: { id: string }[];
};

// Call only after adminOrganization has verified the business for this journey.
export async function ensureOnboardingStorefront(storefrontId: string): Promise<ActionResult<null>> {
  const session = await checkSession(await getDashboardSessionToken(), "dashboard");
  if (session.status !== "valid" || session.payload.role !== "ADMIN")
    return { ok: false, error: "Volvé a ingresar como administrador del negocio." };

  const staff = await dashboardRequest<Staff[]>("/staff", { cache: "no-store" });
  if (!staff.ok) return { ...staff, error: "No pudimos verificar tu acceso a la sucursal. Probá de nuevo." };
  const current = staff.data.find((member) => member.userId === session.payload.sub && member.active && member.role === "ADMIN");
  if (!current) return { ok: false, error: "No encontramos tu acceso de administrador en este negocio. Volvé a ingresar." };

  if (!current.storefronts.some((storefront) => storefront.id === storefrontId)) {
    // Attach is additive; never replace assignments or create another staff member.
    const attached = await dashboardRequest<Staff>(`/staff/${current.id}/storefronts`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ storefrontIds: [storefrontId] }),
      cache: "no-store",
    });
    if (!attached.ok) return { ...attached, error: "No pudimos asignarte la sucursal. Probá de nuevo." };
    if (attached.data.id !== current.id || attached.data.userId !== session.payload.sub ||
      !attached.data.active || attached.data.role !== "ADMIN" ||
      !attached.data.storefronts.some((storefront) => storefront.id === storefrontId))
      return { ok: false, error: "No pudimos confirmar tu acceso a la sucursal. Probá de nuevo." };
  }

  const selected = await selectStorefront(storefrontId);
  if (!selected.success) return { ok: false, error: selected.error };
  const verified = await checkSession(await getDashboardSessionToken(), "dashboard");
  if (verified.status !== "valid" || verified.payload.sub !== session.payload.sub ||
    verified.payload.role !== "ADMIN" || verified.payload.sf !== storefrontId)
    return { ok: false, error: "No pudimos confirmar la sucursal de tu sesión. Probá de nuevo." };
  return { ok: true, data: null };
}
