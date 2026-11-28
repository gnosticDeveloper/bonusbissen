package studio.gnosticdeveloper.bonusbissen.repository;

import java.time.OffsetDateTime;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import studio.gnosticdeveloper.bonusbissen.dto.response.AdminUserInfoResponse;
import studio.gnosticdeveloper.bonusbissen.dto.response.TopClientResponse;
import studio.gnosticdeveloper.bonusbissen.entity.User;

public interface UserRepository extends JpaRepository<User, UUID> {
    Optional<User> findByUsername(String username);
    Optional<User> findByEmail(String email);
    boolean existsByUsername(String username);
    boolean existsByEmail(String email);

    @Query(
        value = """
        SELECT u.username, u.name, os.role, u.email, u.email_verified, u.profile_picture_path
        FROM users u
        JOIN organization_staff os ON os.user_id = u.id
        WHERE u.id = :userId
          AND os.organization_id = :organizationId
          AND os.active = true
        """,
        nativeQuery = true
    )
    Optional<AdminUserInfoResponse.Row> findAdminUserInfo(@Param("userId") UUID userId, @Param("organizationId") UUID organizationId);

    /** The user (aliased {@code c}) has joined one of the organization's programs or is active staff there. */
    String RELATED_TO_ORGANIZATION = """
        (exists (select 1 from user_point_programs upp
                 join point_programs pp on pp.id = upp.point_program_id
                 where upp.user_id = c.id and pp.organization_id = :organizationId)
         or exists (select 1 from organization_staff ors
                    where ors.user_id = c.id and ors.active = true and ors.organization_id = :organizationId))
        """;

    /**
     * Staff search scope (quality report B4): the organization's own members and staff match on any
     * part of name, username or email; anyone else only on their exact username or verified email,
     * so an admin can find a new hire to add as cashier without browsing the whole platform.
     * Peers (the caller's own role in the caller's own organization) are always left out.
     */
    String SEARCH_WHERE = """
        where c.active = true
          and not exists (
                select 1 from organization_staff os
                where os.user_id = c.id and os.active = true
                  and os.organization_id = :organizationId and os.role = :staffRole)
          and (
               (""" + RELATED_TO_ORGANIZATION + """
                and (
                     cast(:search as text) is null
                     or lower(c.name) like lower(concat('%', cast(:search as text), '%'))
                     or lower(c.username) like lower(concat('%', cast(:search as text), '%'))
                     or lower(c.email) like lower(concat('%', cast(:search as text), '%'))
                ))
               or lower(c.username) = lower(cast(:search as text))
               or (c.email_verified = true and lower(c.email) = lower(cast(:search as text)))
          )
        """;

    /** See {@link #SEARCH_WHERE}. {@code staffRole} is the caller's role as its db value. */
    @Query(
        value = "select * from users c " + SEARCH_WHERE,
        countQuery = "select count(*) from users c " + SEARCH_WHERE,
        nativeQuery = true
    )
    Page<User> search(
        @Param("search") String search,
        @Param("organizationId") UUID organizationId,
        @Param("staffRole") String staffRole,
        Pageable pageable
    );

    /** Which of {@code userIds} are related to the organization (see {@link #RELATED_TO_ORGANIZATION}). */
    @Query(
        value = "select c.id from users c where c.id in (:userIds) and " + RELATED_TO_ORGANIZATION,
        nativeQuery = true
    )
    List<UUID> findIdsRelatedToOrganization(@Param("userIds") Collection<UUID> userIds, @Param("organizationId") UUID organizationId);

    /**
     * Customers ranked by net points granted to them in one program since {@code since} (refunds
     * excluded, corrections applied -- see {@link PointTransactionRepository#GRANTED_POINTS_MATCH}).
     * A grant is dated by its original lot, as on the home stats. Deactivated accounts and the
     * staff of the program's organization are left out; staff of another business are ordinary
     * customers here.
     */
    @Query(
        value = """
        SELECT c.id AS id, c.name AS name, CAST(SUM(t.points) AS integer) AS total_points
        FROM point_transactions t
        JOIN users c ON c.id = t.user_id
        JOIN point_programs pp ON pp.id = t.point_program_id
        """ + PointTransactionRepository.CORRECTED_LOT_JOIN + """
        WHERE t.point_program_id = :programId
          AND t.created_at >= :since
          AND coalesce(o.created_at, t.created_at) >= :since
          AND c.active = true
          AND NOT EXISTS (
                SELECT 1 FROM organization_staff os
                WHERE os.user_id = c.id AND os.active = true AND os.organization_id = pp.organization_id)
          AND
        """ + PointTransactionRepository.GRANTED_POINTS_MATCH + """
        GROUP BY c.id, c.name
        HAVING SUM(t.points) > 0
        ORDER BY SUM(t.points) DESC, c.id
        """,
        nativeQuery = true
    )
    List<Object[]> findTopClientsRaw(@Param("programId") UUID programId, @Param("since") OffsetDateTime since, Pageable pageable);

    default List<TopClientResponse> getTopClients(UUID programId, OffsetDateTime since, Pageable pageable) {
        return findTopClientsRaw(programId, since, pageable)
            .stream()
            .map(row -> new TopClientResponse((UUID) row[0], (String) row[1], ((Number) row[2]).intValue()))
            .toList();
    }
}
