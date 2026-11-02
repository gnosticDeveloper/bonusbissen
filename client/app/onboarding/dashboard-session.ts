import "server-only";

import { checkSession, getDashboardSessionToken, getSessionToken } from "@/lib/auth/session";
import { saveDashboardSession } from "@/lib/auth/refresh";

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
  if ((await checkSession(await getDashboardSessionToken(), "dashboard")).status === "valid") return true;

  const token = await getSessionToken();
  if (!token) return false;

  const backendUrl = process.env.BACKEND_URL ?? "http://localhost:8080";
  try {
    const response = await fetch(`${backendUrl}/auth/dashboard/session`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ organizationId }),
      cache: "no-store",
    });
    if (!response.ok) return false;
    const { token: staffToken } = (await response.json()) as { token: string };
    // saveDashboardSession verifies the signature, role and area before writing.
    return await saveDashboardSession(response, staffToken);
  } catch {
    return false;
  }
}
