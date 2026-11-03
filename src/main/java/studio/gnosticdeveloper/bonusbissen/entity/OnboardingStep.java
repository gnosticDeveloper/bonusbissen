package studio.gnosticdeveloper.bonusbissen.entity;

/** The next action an onboarding user has to take, in presentation order; COMPLETED once none remain. */
public enum OnboardingStep {
    CREATE_ORGANIZATION,
    PAY,
    CREATE_STOREFRONT,
    CREATE_POINT_PROGRAM,
    COMPLETED
}
