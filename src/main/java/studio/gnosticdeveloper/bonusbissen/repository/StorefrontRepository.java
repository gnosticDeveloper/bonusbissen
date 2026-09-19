package studio.gnosticdeveloper.bonusbissen.repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import studio.gnosticdeveloper.bonusbissen.entity.Storefront;

public interface StorefrontRepository extends JpaRepository<Storefront, UUID> {
    List<Storefront> findByOrganizationIdOrderByCreatedAt(UUID organizationId);

    Optional<Storefront> findByIdAndOrganizationId(UUID id, UUID organizationId);

    /** Active storefronts running an active program, newest first, optionally by city. */
    @Query(
        value =
            """
            select s.* from storefronts s
            join point_programs pp on pp.id = s.point_program_id
            where s.active and pp.active
              and (cast(:city as text) is null or s.city = cast(:city as text))
            order by s.created_at desc
            """,
        countQuery =
            """
            select count(*) from storefronts s
            join point_programs pp on pp.id = s.point_program_id
            where s.active and pp.active
              and (cast(:city as text) is null or s.city = cast(:city as text))
            """,
        nativeQuery = true
    )
    Page<Storefront> findDiscoverable(@Param("city") String city, Pageable pageable);

    /** Distinct cities that have at least one active storefront, for the city picker. */
    @Query(
        value = "select distinct s.city from storefronts s where s.active and s.city is not null order by s.city",
        nativeQuery = true
    )
    List<String> findDistinctActiveCities();
}
