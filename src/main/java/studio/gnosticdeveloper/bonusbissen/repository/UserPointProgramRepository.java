package studio.gnosticdeveloper.bonusbissen.repository;

import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import studio.gnosticdeveloper.bonusbissen.entity.UserPointProgram;

public interface UserPointProgramRepository extends JpaRepository<UserPointProgram, UUID> {
    boolean existsByUser_IdAndPointProgram_Id(UUID userId, UUID pointProgramId);

    /** True if the user has joined at least one of this organization's point programs -- the relationship staff must have before seeing a customer's PII (see UserService#getUserPointsById). */
    @Query("select count(upp) > 0 from UserPointProgram upp where upp.user.id = :userId and upp.pointProgram.organization.id = :organizationId")
    boolean existsByUserIdAndOrganizationId(@Param("userId") UUID userId, @Param("organizationId") UUID organizationId);

    /** Distinct loyalty members across every program the organization runs. */
    @Query("select count(distinct upp.user.id) from UserPointProgram upp where upp.pointProgram.organization.id = :organizationId")
    int countDistinctUsersByOrganizationId(@Param("organizationId") UUID organizationId);

    /**
     * Users who joined through the storefront, newest first, with their program balance and what they earned and
     * redeemed there (cancelled transactions ignored). Pass an unsorted {@code pageable}: the order is fixed here.
     */
    @Query(
        value = """
        select c.id as id, c.name as name, c.username as username, c.email as email,
               c.email_verified as emailVerified, upp.joined_at as joinedAt,
               (select coalesce(sum(t.points), 0) from point_transactions t
                 where t.user_id = c.id and t.point_program_id = upp.point_program_id) as balance,
               (select coalesce(sum(t.points), 0) from point_transactions t
                 where t.user_id = c.id and t.storefront_id = upp.storefront_id
                   and t.transaction_type = 'earn' and t.refunded_transaction_id is null
                   and t.state <> 'cancelled') as totalEarned,
               (select coalesce(-sum(t.points), 0) from point_transactions t
                 where t.user_id = c.id and t.storefront_id = upp.storefront_id
                   and t.transaction_type = 'redeem' and t.state <> 'cancelled') as totalRedeemed,
               (select max(t.created_at) from point_transactions t
                 where t.user_id = c.id and t.storefront_id = upp.storefront_id) as lastActivityAt
        from user_point_programs upp
        join users c on c.id = upp.user_id
        where upp.storefront_id = :storefrontId
          and c.active = true
          and (
               cast(:search as text) is null
               or lower(c.name) like lower(concat('%', cast(:search as text), '%'))
               or lower(c.username) like lower(concat('%', cast(:search as text), '%'))
               or lower(c.email) like lower(concat('%', cast(:search as text), '%'))
          )
        order by upp.joined_at desc, c.id
        """,
        countQuery = """
        select count(*)
        from user_point_programs upp
        join users c on c.id = upp.user_id
        where upp.storefront_id = :storefrontId
          and c.active = true
          and (
               cast(:search as text) is null
               or lower(c.name) like lower(concat('%', cast(:search as text), '%'))
               or lower(c.username) like lower(concat('%', cast(:search as text), '%'))
               or lower(c.email) like lower(concat('%', cast(:search as text), '%'))
          )
        """,
        nativeQuery = true
    )
    Page<StorefrontUserRow> findStorefrontUsers(@Param("storefrontId") UUID storefrontId, @Param("search") String search, Pageable pageable);
}
