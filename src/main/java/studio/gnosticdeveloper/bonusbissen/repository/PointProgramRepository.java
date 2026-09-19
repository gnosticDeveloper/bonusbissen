package studio.gnosticdeveloper.bonusbissen.repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import studio.gnosticdeveloper.bonusbissen.entity.PointProgram;

public interface PointProgramRepository extends JpaRepository<PointProgram, UUID> {
    @EntityGraph(attributePaths = "storefronts")
    List<PointProgram> findByOrganizationIdOrderByCreatedAt(UUID organizationId);

    @EntityGraph(attributePaths = "storefronts")
    Optional<PointProgram> findByIdAndOrganizationId(UUID id, UUID organizationId);

    /** True when the given program is honoured at the given storefront. */
    boolean existsByIdAndStorefronts_Id(UUID programId, UUID storefrontId);
}
