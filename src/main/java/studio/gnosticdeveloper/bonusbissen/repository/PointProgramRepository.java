package studio.gnosticdeveloper.bonusbissen.repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import studio.gnosticdeveloper.bonusbissen.entity.PointProgram;

public interface PointProgramRepository extends JpaRepository<PointProgram, UUID> {
    @EntityGraph(attributePaths = "storefronts")
    List<PointProgram> findByOrganizationIdOrderByCreatedAt(UUID organizationId);

    @EntityGraph(attributePaths = "storefronts")
    Optional<PointProgram> findByIdAndOrganizationId(UUID id, UUID organizationId);

    /** True when the given program is honoured at the given storefront. */
    boolean existsByIdAndStorefronts_Id(UUID programId, UUID storefrontId);

    /** The storefront's oldest active program -- used as its discover-card program. */
    @Query(
        value =
            """
            select pp.* from point_programs pp
            join point_program_storefronts pps on pps.point_program_id = pp.id
            where pps.storefront_id = :storefrontId and pp.active
            order by pp.created_at asc
            limit 1
            """,
        nativeQuery = true
    )
    Optional<PointProgram> findPrimaryProgramForStorefront(@Param("storefrontId") UUID storefrontId);
}
