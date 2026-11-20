package studio.gnosticdeveloper.bonusbissen.repository;

import java.util.Set;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import studio.gnosticdeveloper.bonusbissen.entity.UserPointProgram;

public interface UserPointProgramRepository extends JpaRepository<UserPointProgram, UUID> {
    /** The sort keys {@link #findStorefrontUsers} understands; anything else must be rejected before the query. */
    Set<String> STOREFRONT_USER_SORTS = Set.of("name", "joinedAt", "balance", "totalEarned", "totalRedeemed", "lastActivityAt");

    boolean existsByUser_IdAndPointProgram_Id(UUID userId, UUID pointProgramId);

    /** True if the user has joined at least one of this organization's point programs -- the relationship staff must have before seeing a customer's PII (see UserService#getUserPointsById). */
    @Query("select count(upp) > 0 from UserPointProgram upp where upp.user.id = :userId and upp.pointProgram.organization.id = :organizationId")
    boolean existsByUserIdAndOrganizationId(@Param("userId") UUID userId, @Param("organizationId") UUID organizationId);

    /** Distinct loyalty members across every program the organization runs. */
    @Query("select count(distinct upp.user.id) from UserPointProgram upp where upp.pointProgram.organization.id = :organizationId")
    int countDistinctUsersByOrganizationId(@Param("organizationId") UUID organizationId);

    /**
     * Users who joined through the storefront, with their program balance and what they earned and redeemed there
     * (cancelled transactions ignored). {@code sort} must be one of {@link #STOREFRONT_USER_SORTS}; ties break on id so
     * pages stay stable, and never-active users sort last by {@code lastActivityAt} in either direction. Pass an
     * unsorted {@code pageable}: the order is fixed here.
     */
    @Query(
        value = """
        select * from (
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
        ) r
        order by
            case when :sort = 'name' and not :desc then lower(r.name) end asc,
            case when :sort = 'name' and :desc then lower(r.name) end desc,
            case when :sort = 'joinedAt' and not :desc then r.joinedAt end asc,
            case when :sort = 'joinedAt' and :desc then r.joinedAt end desc,
            case when :sort = 'balance' and not :desc then r.balance end asc,
            case when :sort = 'balance' and :desc then r.balance end desc,
            case when :sort = 'totalEarned' and not :desc then r.totalEarned end asc,
            case when :sort = 'totalEarned' and :desc then r.totalEarned end desc,
            case when :sort = 'totalRedeemed' and not :desc then r.totalRedeemed end asc,
            case when :sort = 'totalRedeemed' and :desc then r.totalRedeemed end desc,
            case when :sort = 'lastActivityAt' and not :desc then r.lastActivityAt end asc nulls last,
            case when :sort = 'lastActivityAt' and :desc then r.lastActivityAt end desc nulls last,
            r.id
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
    Page<StorefrontUserRow> findStorefrontUsers(
        @Param("storefrontId") UUID storefrontId,
        @Param("search") String search,
        @Param("sort") String sort,
        @Param("desc") boolean desc,
        Pageable pageable
    );
}
