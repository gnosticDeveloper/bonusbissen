package studio.gnosticdeveloper.bonusbissen.merchant;

import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface MerchantIntegrationRepository extends JpaRepository<MerchantIntegration, UUID> {
    Optional<MerchantIntegration> findByKeyIdAndActiveTrueAndProvider(String keyId, String provider);

    List<MerchantIntegration> findAllByOrganization_IdOrderByCreatedAtDesc(UUID organizationId);

    Optional<MerchantIntegration> findByIdAndOrganization_Id(UUID id, UUID organizationId);
}
