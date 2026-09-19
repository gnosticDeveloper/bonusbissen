package studio.gnosticdeveloper.bonusbissen.repository;

import java.util.List;
import java.util.UUID;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import studio.gnosticdeveloper.bonusbissen.entity.PointTransaction;
import studio.gnosticdeveloper.bonusbissen.entity.TransactionState;
import studio.gnosticdeveloper.bonusbissen.entity.TransactionType;

public interface PointTransactionRepository extends JpaRepository<PointTransaction, UUID> {
    // Plain SQL everywhere here, not JPQL: JPQL "select new <DTO>(...)"
    // requires the DTO's fully qualified name (Hibernate parses the query
    // string at runtime, so it never sees this file's imports), and the
    // same goes for enum literals like TransactionType.EARN. Native SQL
    // sidesteps both -- enum values are just their stored string ('earn',
    // 'delivered', ...), bound via the *Raw default-method wrappers below.
    //
    // Every point_transaction now carries point_program_id (NOT NULL), and a
    // program belongs to exactly one organization, so an org-scoped query is
    // a single join: point_transactions -> point_programs -> organization_id.
    String ORG_JOIN = " join point_programs pp on pp.id = t.point_program_id ";
    String ORG_MATCH = " pp.organization_id = :organizationId ";

    @Query(
        value = "select t.* from point_transactions t where t.user_id = :userId and t.state = :state order by t.created_at desc",
        nativeQuery = true
    )
    List<PointTransaction> findAllPendingByUserIdOrderByCreatedAtDescRaw(@Param("userId") UUID userId, @Param("state") String state);

    default List<PointTransaction> findAllPendingByUserIdOrderByCreatedAtDesc(UUID userId, TransactionState state) {
        return findAllPendingByUserIdOrderByCreatedAtDescRaw(userId, state.getValue());
    }

    @Query(
        """
        SELECT pt FROM PointTransaction pt
        JOIN FETCH pt.reward
        LEFT JOIN FETCH pt.storefront
        JOIN FETCH pt.pointProgram pp
        JOIN FETCH pp.organization
        WHERE pt.user.id = :userId
          AND pt.transactionType = :type
          AND (:organizationId IS NULL OR pp.organization.id = :organizationId)
        ORDER BY pt.createdAt DESC
        """
    )
    List<PointTransaction> findExchangeHistory(
        @Param("userId") UUID userId,
        @Param("type") TransactionType type,
        @Param("organizationId") UUID organizationId
    );

    @Query(
        value = "select t.* from point_transactions t where t.user_id = :userId and t.transaction_type = :transactionType order by t.created_at desc",
        nativeQuery = true
    )
    List<PointTransaction> findAllByUserIdAndTypeOrderByCreatedAtDescRaw(
        @Param("userId") UUID userId,
        @Param("transactionType") String transactionType
    );

    default List<PointTransaction> findAllByUserIdAndTypeOrderByCreatedAtDesc(UUID userId, TransactionType transactionType) {
        return findAllByUserIdAndTypeOrderByCreatedAtDescRaw(userId, transactionType.getValue());
    }

    @Query(value = "select t.* from point_transactions t where t.user_id = :userId order by t.created_at desc", nativeQuery = true)
    List<PointTransaction> findAllByUserIdOrderByCreatedAtDesc(@Param("userId") UUID userId);

    /** A user's balance in one point program. */
    @Query(
        value = "select coalesce(sum(t.points), 0) from point_transactions t where t.user_id = :userId and t.point_program_id = :programId",
        nativeQuery = true
    )
    int calculateBalance(@Param("userId") UUID userId, @Param("programId") UUID programId);

    /** One row per point program the user has ever transacted in, for the points carousel. */
    @Query(
        value = """
        select
          pp.id                                as program_id,
          pp.unit_label                        as unit_label,
          o.id                                 as org_id,
          o.name                               as org_name,
          sf.category                          as category,
          sf.color                             as color,
          sf.icon_path                         as logo_url,
          to_char(min(t.created_at) at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') as member_since,
          coalesce(sum(t.points), 0)           as points,
          count(*) filter (where t.transaction_type = 'redeem' and t.state = 'delivered') as redemptions
        from point_transactions t
        join point_programs pp on pp.id = t.point_program_id
        join organizations o on o.id = pp.organization_id
        left join lateral (
            select s.category, s.color, s.icon_path
            from storefronts s
            where s.point_program_id = pp.id and s.active
            order by s.created_at asc
            limit 1
        ) sf on true
        where t.user_id = :userId
        group by pp.id, pp.unit_label, o.id, o.name, sf.category, sf.color, sf.icon_path
        order by member_since asc
        """,
        nativeQuery = true
    )
    List<Object[]> findMembershipRowsRaw(@Param("userId") UUID userId);

    @Query(
        value = "select coalesce(count(t.id), 0) from point_transactions t " + ORG_JOIN + " where t.state = :state and " + ORG_MATCH,
        nativeQuery = true
    )
    Integer countByStateAndOrganizationIdRaw(@Param("state") String state, @Param("organizationId") UUID organizationId);

    default Integer countByStateAndOrganizationId(TransactionState state, UUID organizationId) {
        return countByStateAndOrganizationIdRaw(state.getValue(), organizationId);
    }

    @Query(
        value = "select t.* from point_transactions t " + ORG_JOIN + " where t.state = :state and " + ORG_MATCH + " order by t.created_at desc",
        nativeQuery = true
    )
    List<PointTransaction> findAllByStateAndOrganizationIdOrderByCreatedAtDescRaw(
        @Param("state") String state,
        @Param("organizationId") UUID organizationId
    );

    default List<PointTransaction> findAllByStateAndOrganizationIdOrderByCreatedAtDesc(TransactionState state, UUID organizationId) {
        return findAllByStateAndOrganizationIdOrderByCreatedAtDescRaw(state.getValue(), organizationId);
    }

    @Query(
        value = "select coalesce(count(t.id), 0) from point_transactions t " +
            ORG_JOIN +
            " where t.transaction_type = :transactionType and t.state != 'cancelled' and " +
            ORG_MATCH,
        nativeQuery = true
    )
    Integer countByTransactionTypeRaw(@Param("transactionType") String transactionType, @Param("organizationId") UUID organizationId);

    default Integer countByTransactionType(TransactionType transactionType, UUID organizationId) {
        return countByTransactionTypeRaw(transactionType.getValue(), organizationId);
    }

    @Query(
        value = "select coalesce(count(t.id), 0) from point_transactions t " +
            ORG_JOIN +
            " where t.transaction_type = :transactionType and t.state = 'pending' and " +
            ORG_MATCH,
        nativeQuery = true
    )
    Integer countByTransactionTypeStatePendingRaw(@Param("transactionType") String transactionType, @Param("organizationId") UUID organizationId);

    default Integer countByTransactionTypeStatePending(TransactionType transactionType, UUID organizationId) {
        return countByTransactionTypeStatePendingRaw(transactionType.getValue(), organizationId);
    }

    @Query(
        value = "select coalesce(sum(t.points), 0) from point_transactions t " +
            ORG_JOIN +
            " where t.transaction_type = :transactionType and t.state = 'delivered' and " +
            ORG_MATCH,
        nativeQuery = true
    )
    Integer calculatePointsAwardedRaw(@Param("transactionType") String transactionType, @Param("organizationId") UUID organizationId);

    default Integer calculatePointsAwarded(TransactionType transactionType, UUID organizationId) {
        return calculatePointsAwardedRaw(transactionType.getValue(), organizationId);
    }

    @Query(value = "select t.* from point_transactions t " + ORG_JOIN + " where " + ORG_MATCH, nativeQuery = true)
    List<PointTransaction> findAllWithRelations(@Param("organizationId") UUID organizationId);

    @Query(
        value = """
        select t.* from point_transactions t
        join point_programs pp on pp.id = t.point_program_id
        where pp.organization_id = :organizationId
          and t.transaction_type = 'earn'
          and t.employee_id is not null
          and (:userId is null or t.user_id = :userId)
        order by t.created_at desc
        """,
        nativeQuery = true
    )
    List<PointTransaction> findGrantHistory(@Param("organizationId") UUID organizationId, @Param("userId") UUID userId, Pageable pageable);

    @Query(
        value = """
        select t.* from point_transactions t
        join point_programs pp on pp.id = t.point_program_id
        where pp.organization_id = :organizationId
          and t.transaction_type = 'redeem'
          and t.state != 'pending'
        order by t.created_at desc
        """,
        nativeQuery = true
    )
    List<PointTransaction> findAllResolvedByOrganizationId(@Param("organizationId") UUID organizationId, Pageable pageable);
}
