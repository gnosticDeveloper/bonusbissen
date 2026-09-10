package studio.gnosticdeveloper.bonusbissen.repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import studio.gnosticdeveloper.bonusbissen.entity.Storefront;

public interface StorefrontRepository extends JpaRepository<Storefront, UUID> {
    List<Storefront> findByOrganizationIdOrderByCreatedAt(UUID organizationId);

    Optional<Storefront> findByIdAndOrganizationId(UUID id, UUID organizationId);
}
