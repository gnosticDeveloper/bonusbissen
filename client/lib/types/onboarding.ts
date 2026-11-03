/**
 * Wire form of the backend's `OnboardingStep` (`GET /onboarding`): the first
 * unfinished step of the business setup, or `COMPLETED` when none remain.
 * Declared here so client code can map it to a slide without importing the
 * server-only reader.
 */
export const ONBOARDING_STEPS = [
  "CREATE_ORGANIZATION",
  "PAY",
  "CREATE_STOREFRONT",
  "CREATE_POINT_PROGRAM",
  "COMPLETED",
] as const;

export type OnboardingBackendStep = (typeof ONBOARDING_STEPS)[number];
