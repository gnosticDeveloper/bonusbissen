package studio.gnosticdeveloper.bonusbissen.repository;

import java.time.OffsetDateTime;
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

    @Query("""
        SELECT t FROM PointTransaction t WHERE t.user.id = :userId
        AND (t.storefront.id = :storefrontId OR (t.correctedTransaction IS NOT NULL
            AND t.pointProgram.id = (SELECT s.pointProgram.id FROM Storefront s WHERE s.id = :storefrontId)))
        ORDER BY t.createdAt DESC
        """)
    List<PointTransaction> findAllByUserIdAndStorefrontIdOrderByCreatedAtDesc(@Param("userId") UUID userId, @Param("storefrontId") UUID storefrontId);

    @Query("select coalesce(sum(t.points), 0) from PointTransaction t where t.correctedTransaction.id = :originalId")
    long sumCorrections(@Param("originalId") UUID originalId);

    @Query("""
        select t.correctedTransaction.id, sum(t.points) from PointTransaction t
        where t.correctedTransaction.id in :originalIds
        group by t.correctedTransaction.id
        """)
    List<Object[]> sumCorrectionsByOriginalIds(@Param("originalIds") List<UUID> originalIds);

    /** Dedupes a retried/double-clicked manual grant: same user, program, employee, amount and note, submitted moments ago. */
    @Query("""
        SELECT t FROM PointTransaction t
        WHERE t.user.id = :userId AND t.pointProgram.id = :programId AND t.employee.id = :employeeId
          AND t.points = :points AND t.correctedTransaction IS NULL AND t.createdAt >= :since
        ORDER BY t.createdAt DESC
        """)
    List<PointTransaction> findRecentGrants(
        @Param("userId") UUID userId,
        @Param("programId") UUID programId,
        @Param("employeeId") UUID employeeId,
        @Param("points") int points,
        @Param("since") OffsetDateTime since
    );

    /** Dedupes a retried/double-clicked correction: same original transaction and employee, submitted moments ago. */
    @Query("""
        SELECT t FROM PointTransaction t
        WHERE t.correctedTransaction.id = :originalId AND t.employee.id = :employeeId AND t.createdAt >= :since
        ORDER BY t.createdAt DESC
        """)
    List<PointTransaction> findRecentCorrections(
        @Param("originalId") UUID originalId,
        @Param("employeeId") UUID employeeId,
        @Param("since") OffsetDateTime since
    );

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
          and t.transaction_type in ('earn', 'adjust')
          and t.employee_id is not null
          and t.refunded_transaction_id is null
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
