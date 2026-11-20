package studio.gnosticdeveloper.bonusbissen.repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import studio.gnosticdeveloper.bonusbissen.entity.PointProgram;

public interface PointProgramRepository extends JpaRepository<PointProgram, UUID> {
    @EntityGraph(attributePaths = "storefronts")
    List<PointProgram> findByOrganizationIdOrderByCreatedAt(UUID organizationId);

    @EntityGraph(attributePaths = "storefronts")
    Optional<PointProgram> findByIdAndOrganizationId(UUID id, UUID organizationId);

    boolean existsByIdAndOrganizationId(UUID id, UUID organizationId);

    @Modifying
    @Query("update PointProgram p set p.active = false where p.organization.id = :organizationId")
    void deactivateAllByOrganizationId(@Param("organizationId") UUID organizationId);

    /** True when the given program is honoured at the given storefront. */
    boolean existsByIdAndStorefronts_Id(UUID programId, UUID storefrontId);
}
