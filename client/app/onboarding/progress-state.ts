import "server-only";

import { z } from "zod";
import { backendFetch } from "@/lib/api";
import { UserRole } from "@/lib/types/user";
import type { SessionCheck } from "@/lib/auth/session";
import { ONBOARDING_STEPS, type OnboardingBackendStep } from "@/lib/types/onboarding";

// The backend ignores unknown keys for us: only the step and the business it
// belongs to are used here. Timestamps stay server-side evidence.
const onboardingSchema = z.object({
  currentStep: z.enum(ONBOARDING_STEPS),
  organizationId: z.uuid().nullable().optional(),
});

export type OnboardingProgressRead =
  /** The backend answered with a step for the verified identity. */
  | { status: "ok"; step: OnboardingBackendStep; organizationId: string | null }
  /** No usable session: the endpoint was deliberately not called. */
  | { status: "skipped" }
  /** The backend rejected the verified token (401/403). */
  | { status: "rejected" }
  /** Transport, status or payload problem; progress stays unknown. */
  | { status: "unavailable" };

/** A verified session and the exact token that was verified for it. */
export type SessionToken = { check: SessionCheck; token?: string };

/**
 * `GET /onboarding` is `hasAnyRole('USER','ADMIN')` over the authenticated
 * principal and has no null-session branch: calling it without a session answers
 * 403. So the session is verified *here* and the request is skipped when none is
 * usable — a missing session is a normal state of this journey, not an error.
 *
 * The answer is a recovery hint only. It names the first unfinished step; it
 * never grants one. Callers clamp it with the resources the backend verified.
 */
export async function readOnboardingProgress(
  sessions: { customer: SessionToken; dashboard: SessionToken },
  expectedUserId: string | null,
): Promise<OnboardingProgressRead> {
  const token = usableToken(sessions, expectedUserId);
  if (!token) return { status: "skipped" };

  const result = await backendFetch(
    "/onboarding",
    { cache: "no-store", redirect: "error" },
    { token, schema: onboardingSchema, timeoutMs: 10_000 },
  );

  if (result.ok) return { status: "ok", step: result.data.currentStep, organizationId: result.data.organizationId ?? null };
  if (result.status === 401 || result.status === 403) return { status: "rejected" };
  // Any other status, an invalid payload, a timeout or a network error.
  return { status: "unavailable" };
}

/**
 * The dashboard session comes first: after the dashboard-session switch it is the
 * one that stays current. A CASHIER token is a valid dashboard session the
 * endpoint would reject, and either token must belong to the identity this page
 * already verified, so neither is sent on a guess.
 */
function usableToken({ customer, dashboard }: { customer: SessionToken; dashboard: SessionToken }, expectedUserId: string | null) {
  if (!expectedUserId) return null;
  const usable = [
    { session: dashboard, role: UserRole.ADMIN },
    { session: customer, role: UserRole.USER },
  ].find(({ session, role }) =>
    Boolean(session.token) &&
    session.check.status === "valid" &&
    session.check.payload.role === role &&
    session.check.payload.sub === expectedUserId,
  );
  return usable?.session.token ?? null;
}
