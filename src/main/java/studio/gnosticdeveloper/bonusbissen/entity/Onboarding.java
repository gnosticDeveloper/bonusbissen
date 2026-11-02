package studio.gnosticdeveloper.bonusbissen.entity;

import jakarta.persistence.*;
import java.time.OffsetDateTime;
import java.util.UUID;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/**
 * A user's progress through setting up their business (see 13__onboarding.sql). Each step is a
 * timestamp set once; the current step is the first one still null.
 */
@Entity
@Table(name = "onboarding")
@Getter
@Setter
@NoArgsConstructor
public class Onboarding {

    @Id
    @Column(name = "user_id")
    private UUID userId;

    @Column(name = "organization_id")
    private UUID organizationId;

    @Column(name = "organization_created_at")
    private OffsetDateTime organizationCreatedAt;

    @Column(name = "paid_at")
    private OffsetDateTime paidAt;

    @Column(name = "storefront_created_at")
    private OffsetDateTime storefrontCreatedAt;

    @Column(name = "point_program_created_at")
    private OffsetDateTime pointProgramCreatedAt;

    @Column(name = "completed_at")
    private OffsetDateTime completedAt;

    @Column(name = "created_at", nullable = false, updatable = false)
    private OffsetDateTime createdAt;

    public Onboarding(UUID userId) {
        this.userId = userId;
    }

    /** The first step still unfinished, or COMPLETED. */
    public OnboardingStep currentStep() {
        if (organizationCreatedAt == null) return OnboardingStep.CREATE_ORGANIZATION;
        if (paidAt == null) return OnboardingStep.PAY;
        if (storefrontCreatedAt == null) return OnboardingStep.CREATE_STOREFRONT;
        if (pointProgramCreatedAt == null) return OnboardingStep.CREATE_POINT_PROGRAM;
        return OnboardingStep.COMPLETED;
    }

    @PrePersist
    protected void onCreate() {
        if (createdAt == null) {
            createdAt = OffsetDateTime.now();
        }
    }
}
