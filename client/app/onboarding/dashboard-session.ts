import "server-only";

import { backendFetchWithResponse } from "@/lib/api";
import { currentSession, getSessionToken } from "@/lib/auth/session";
import { saveDashboardSession } from "@/lib/auth/refresh";
import { sessionTokenSchema } from "@/schemas/user";

/**
 * Trades the verified customer session for a dashboard (ADMIN) one via
 * `POST /auth/dashboard/session`, so creating a business does not ask for the
 * password a second time. The backend requires a USER bearer token and an
 * active ADMIN membership of exactly this organization; `OrganizationService`
 * creates that membership in the same transaction as the organization, so the
 * exchange is valid as soon as `POST /organizations` returns.
 *
 * The minted token carries no `sf` claim yet -- the business has no storefronts
 * at this point. Step 4 still mints it through `ensureOnboardingStorefront`.
 *
 * Returns false instead of throwing: the organization already exists, so a
 * failed exchange must leave the journey on the admin login form rather than
 * fail the step.
 */
export async function exchangeDashboardSession(organizationId: string): Promise<boolean> {
  // The endpoint rejects a caller who already holds a staff token.
  if ((await currentSession("dashboard")).status === "valid") return true;

  const token = await getSessionToken();
  if (!token) return false;

  const result = await backendFetchWithResponse(
    "/auth/dashboard/session",
    { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ organizationId }), cache: "no-store" },
    { token, schema: sessionTokenSchema },
  );
  if (!result.ok) return false;

  // saveDashboardSession verifies the signature, role and area before writing.
  return saveDashboardSession(result.response, result.data.token).catch(() => false);
}
