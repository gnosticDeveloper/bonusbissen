"use server";

import { z } from "zod";
import { dashboardRequest, type ActionResult } from "@/lib/api";
import { parseOrError } from "@/lib/action-helpers";
import { currentSession, type Payload } from "@/lib/auth/session";
import type { Customer } from "@/lib/types/customer";
import type { PagedRequestFunction, PagedResponse } from "@/lib/types/paging";
import type { StaffMember } from "@/lib/types/staff";
import type { Storefront } from "@/lib/types/storefront";
import { UserRole } from "@/lib/types/user";

const JSON_HEADERS = { "Content-Type": "application/json" };

/**
 * Server actions are not covered by the admin-only layout, so each mutation
 * checks the verified session itself. The backend (`/staff` is ADMIN-only and
 * organization-scoped) remains the authority; this only fails early and gives
 * the self-protection check below a verified user id.
 */
async function adminSession(): Promise<ActionResult<Payload>> {
  const session = await currentSession("dashboard");
  if (session.status === "unavailable") {
    return { ok: false, status: 503, error: "No pudimos verificar tu sesión. Reintentá en un momento." };
  }
  if (session.status !== "valid") {
    return { ok: false, status: 401, error: "Tu sesión terminó. Volvé a cargar la página para continuar." };
  }
  if (session.payload.role !== UserRole.ADMIN) {
    return { ok: false, status: 403, error: "Solo un administrador puede gestionar el equipo." };
  }
  return { ok: true, data: session.payload };
}

// --- Reads ---

/** Every staff membership of the organization, including the caller and deactivated rows. */
export async function getStaff(): Promise<ActionResult<StaffMember[]>> {
  return await dashboardRequest<StaffMember[]>("/staff", { cache: "no-store" });
}

export async function getOrganizationStorefronts(): Promise<ActionResult<Storefront[]>> {
  return await dashboardRequest<Storefront[]>("/storefronts", { cache: "no-store" });
}

/**
 * Accounts that can be added to the team, from the staff search `GET /users`.
 * For an admin the backend leaves out the organization's admins; anyone already
 * on a team still shows up and is rejected by `POST /staff`.
 *
 * Throws instead of returning an `ActionResult`: `Autocomplete` catches it.
 */
export const searchStaffCandidates: PagedRequestFunction<Customer> = async ({ search, page, size }) => {
  const params = new URLSearchParams({ page: String(page), size: String(size) });
  if (search) params.append("search", search);

  const result = await dashboardRequest<PagedResponse<Customer>>(`/users?${params.toString()}`, { cache: "no-store" });
  if (!result.ok) throw new Error(result.error);
  return result.data;
};

// --- Mutations ---

const uuid = (message: string) => z.uuid(message);

const addCashierSchema = z.object({
  userId: uuid("Elegí una persona de la lista."),
  storefrontId: uuid("Elegí un local de la lista."),
});

/**
 * Adds an existing account to the organization as a CASHIER of one storefront.
 * The backend promotes the account directly (there is no invitation to accept).
 */
export async function addCashier(input: { userId: string; storefrontId: string }): Promise<ActionResult<StaffMember>> {
  const parsed = parseOrError(addCashierSchema, input);
  if (!parsed.ok) return parsed;

  const auth = await adminSession();
  if (!auth.ok) return auth;

  // The backend checks that the storefront belongs to the organization, but not
  // that it is active, and a cashier cannot sign in to a deactivated storefront.
  const storefronts = await getOrganizationStorefronts();
  if (!storefronts.ok) return storefronts;
  const storefront = storefronts.data.find((s) => s.id === parsed.data.storefrontId);
  if (!storefront) return { ok: false, status: 400, error: "Ese local ya no pertenece a tu negocio. Volvé a cargar la página." };
  if (!storefront.active) return { ok: false, status: 400, error: "Ese local está desactivado. Elegí un local activo." };

  return await dashboardRequest<StaffMember>("/staff", {
    method: "POST",
    headers: JSON_HEADERS,
    body: JSON.stringify({ userId: parsed.data.userId, role: UserRole.CASHIER, storefrontId: parsed.data.storefrontId }),
  });
}

const staffIdSchema = uuid("No encontramos a esa persona en tu equipo. Volvé a cargar la página.");

/**
 * Removes a member from the team (`DELETE /staff/{id}` deactivates the
 * membership and closes their sessions). Nobody can remove themselves here:
 * the backend does not prevent it, so the check is made against the verified
 * session before the request.
 */
export async function removeStaffMember(staffId: string): Promise<ActionResult<void>> {
  const parsed = parseOrError(staffIdSchema, staffId);
  if (!parsed.ok) return parsed;

  const auth = await adminSession();
  if (!auth.ok) return auth;

  const staff = await getStaff();
  if (!staff.ok) return staff;
  const member = staff.data.find((m) => m.id === parsed.data);
  if (!member) return { ok: false, status: 404, error: "No encontramos a esa persona en tu equipo. Volvé a cargar la página." };
  if (member.userId === auth.data.sub) return { ok: false, status: 403, error: "No podés quitarte a vos mismo del equipo." };
  if (!member.active) return { ok: true, data: undefined };

  return await dashboardRequest<void>(`/staff/${encodeURIComponent(member.id)}`, { method: "DELETE" });
}
