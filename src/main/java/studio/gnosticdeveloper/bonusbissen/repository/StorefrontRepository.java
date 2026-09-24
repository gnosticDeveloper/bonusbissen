package studio.gnosticdeveloper.bonusbissen.repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import studio.gnosticdeveloper.bonusbissen.dto.response.StorefrontDiscoverResponse;
import studio.gnosticdeveloper.bonusbissen.entity.Storefront;

public interface StorefrontRepository extends JpaRepository<Storefront, UUID> {
    List<Storefront> findByOrganizationIdOrderByCreatedAt(UUID organizationId);

    Optional<Storefront> findByIdAndOrganizationId(UUID id, UUID organizationId);

    /**
     * Active storefronts running an active program, newest first, optionally by
     * city. {@code city} is matched against the same "Localidad, Provincia"
     * display string the /discover/cities picker returns -- city and province
     * are stored as separate columns, so it's rebuilt here at query time.
     */
    @Query(
        value = """
        select s.* from storefronts s
        join point_programs pp on pp.id = s.point_program_id
        where s.active and pp.active
          and (cast(:city as text) is null or (s.city || ', ' || s.province) = cast(:city as text))
        order by s.created_at desc
        """,
        countQuery = """
        select count(*) from storefronts s
        join point_programs pp on pp.id = s.point_program_id
        where s.active and pp.active
          and (cast(:city as text) is null or (s.city || ', ' || s.province) = cast(:city as text))
        """,
        nativeQuery = true
    )
    Page<Storefront> findDiscoverable(@Param("city") String city, Pageable pageable);

    /** Distinct "Localidad, Provincia" combos with at least one active storefront, for the city picker. */
    @Query(
        value = """
        select distinct s.city || ', ' || s.province from storefronts s
        where s.active and s.city is not null and s.province is not null
        order by 1
        """,
        nativeQuery = true
    )
    List<String> findDistinctActiveCities();

    /** Storefronts whose point program the user has joined -- for the "/me" self profile. */
    @Query(
        "select s.id from Storefront s where s.pointProgram.id in "
            + "(select upp.pointProgram.id from UserPointProgram upp where upp.user.id = :userId)"
    )
    List<UUID> findIdsByMemberUserId(@Param("userId") UUID userId);

    @Query(
        value = """
            SELECT
                s.id AS id,
                s.name AS name,
                o.name AS org_name,
                s.color AS color,
                s.icon_path AS icon_url,
                pp.unit_label AS point_label
            FROM storefronts s
            JOIN organizations o ON o.id = s.organization_id
            LEFT JOIN point_programs pp ON pp.id = s.point_program_id AND pp.active = true
            WHERE s.id = :id AND s.active = true
            """,
        nativeQuery = true
    )
    Optional<StorefrontDiscoverResponse> getBasicInfoById(@Param("id") UUID id);
}
