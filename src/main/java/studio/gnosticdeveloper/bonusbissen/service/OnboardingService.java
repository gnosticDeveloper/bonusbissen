package studio.gnosticdeveloper.bonusbissen.service;

import java.time.OffsetDateTime;
import java.util.UUID;
import java.util.function.BiConsumer;
import java.util.function.Function;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import studio.gnosticdeveloper.bonusbissen.entity.Onboarding;
import studio.gnosticdeveloper.bonusbissen.entity.OnboardingStep;
import studio.gnosticdeveloper.bonusbissen.repository.OnboardingRepository;

/**
 * Records onboarding progress. The {@code mark*} hooks are called from the services that perform
 * each step, inside their transaction, and are idempotent: a step's timestamp is set once, and an
 * org with no onboarding row (created before tracking, or by a path that skipped it) is ignored.
 */
@Service
public class OnboardingService {

    private final OnboardingRepository repository;

    public OnboardingService(OnboardingRepository repository) {
        this.repository = repository;
    }

    /** The caller's progress; a user who hasn't started yet gets an empty (unsaved-looking) one created. */
    @Transactional
    public Onboarding getOrCreate(UUID userId) {
        return repository.findById(userId).orElseGet(() -> repository.save(new Onboarding(userId)));
    }

    @Transactional
    public void markOrganizationCreated(UUID userId, UUID organizationId) {
        Onboarding o = getOrCreate(userId);
        if (o.getOrganizationCreatedAt() != null) return;
        o.setOrganizationId(organizationId);
        o.setOrganizationCreatedAt(OffsetDateTime.now());
        repository.save(o);
    }

    @Transactional
    public void markPaid(UUID organizationId) {
        mark(organizationId, Onboarding::getPaidAt, Onboarding::setPaidAt);
    }

    @Transactional
    public void markStorefrontCreated(UUID organizationId) {
        mark(organizationId, Onboarding::getStorefrontCreatedAt, Onboarding::setStorefrontCreatedAt);
    }

    @Transactional
    public void markPointProgramCreated(UUID organizationId) {
        mark(organizationId, Onboarding::getPointProgramCreatedAt, Onboarding::setPointProgramCreatedAt);
    }

    private void mark(UUID organizationId, Function<Onboarding, OffsetDateTime> getter, BiConsumer<Onboarding, OffsetDateTime> setter) {
        repository.findByOrganizationId(organizationId).ifPresent(o -> {
            if (getter.apply(o) != null) return;
            OffsetDateTime now = OffsetDateTime.now();
            setter.accept(o, now);
            if (o.getCompletedAt() == null && o.currentStep() == OnboardingStep.COMPLETED) {
                o.setCompletedAt(now);
            }
            repository.save(o);
        });
    }
}
