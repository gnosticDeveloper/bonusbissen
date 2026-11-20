package studio.gnosticdeveloper.bonusbissen.dto.response;

import java.time.OffsetDateTime;
import java.util.UUID;
import studio.gnosticdeveloper.bonusbissen.entity.Onboarding;
import studio.gnosticdeveloper.bonusbissen.entity.OnboardingStep;

/** {@code currentStep} is the first unfinished step, or COMPLETED. */
public record OnboardingResponse(
    OnboardingStep currentStep,
    UUID organizationId,
    OffsetDateTime organizationCreatedAt,
    OffsetDateTime paidAt,
    OffsetDateTime storefrontCreatedAt,
    OffsetDateTime pointProgramCreatedAt,
    OffsetDateTime completedAt
) {
    public static OnboardingResponse from(Onboarding o) {
        return new OnboardingResponse(
            o.currentStep(), o.getOrganizationId(), o.getOrganizationCreatedAt(), o.getPaidAt(),
            o.getStorefrontCreatedAt(), o.getPointProgramCreatedAt(), o.getCompletedAt()
        );
    }
}
