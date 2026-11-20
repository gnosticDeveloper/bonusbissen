package studio.gnosticdeveloper.bonusbissen.repository;

import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import studio.gnosticdeveloper.bonusbissen.entity.Onboarding;

public interface OnboardingRepository extends JpaRepository<Onboarding, UUID> {

    Optional<Onboarding> findByOrganizationId(UUID organizationId);
}
