package studio.gnosticdeveloper.bonusbissen.repository;

import java.time.Instant;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import jakarta.persistence.LockModeType;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Modifying;
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

    /**
     * Rows that make up "points granted": staff/system earn lots, minus refund rows (an earn row
     * that only gives back a cancelled redemption's points), plus the adjust rows that correct one
     * of those lots, so a grant counts at its corrected total. Standalone adjust rows (manual
     * subtractions) and expirations are not grants. Requires {@code t} and a
     * {@code left join point_transactions o on o.id = t.corrected_transaction_id}.
     */
    String GRANTED_POINTS_MATCH = """
         t.state = 'delivered'
         and ((t.transaction_type = 'earn' and t.refunded_transaction_id is null)
              or (t.transaction_type = 'adjust' and o.transaction_type = 'earn'))
        """;
    String CORRECTED_LOT_JOIN = " left join point_transactions o on o.id = t.corrected_transaction_id ";

    /**
     * {@code organizationId} null means "the caller is the customer themselves" -- every one of
     * their own pending exchanges, across every business they belong to. Non-null means "the
     * caller is staff", scoped to that one organization's exchanges only -- without this, any
     * authenticated staff member could read another organization's customer's pending
     * redemptions (including the redemption code) by guessing/enumerating a user id.
     */
    @Query(
        value = "select t.* from point_transactions t " + ORG_JOIN +
            " where t.user_id = :userId and t.state = :state and (cast(:organizationId as uuid) is null or " + ORG_MATCH + ") order by t.created_at desc",
        nativeQuery = true
    )
    List<PointTransaction> findAllPendingByUserIdOrderByCreatedAtDescRaw(
        @Param("userId") UUID userId, @Param("state") String state, @Param("organizationId") UUID organizationId);

    default List<PointTransaction> findAllPendingByUserIdOrderByCreatedAtDesc(UUID userId, TransactionState state, UUID organizationId) {
        return findAllPendingByUserIdOrderByCreatedAtDescRaw(userId, state.getValue(), organizationId);
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
        SELECT t FROM PointTransaction t
        JOIN Storefront s ON s.id = :storefrontId
        LEFT JOIN t.correctedTransaction correction
        LEFT JOIN t.expiredTransaction expired
        WHERE t.user.id = :userId
          AND t.pointProgram.organization.id = s.organization.id
          AND (t.storefront.id = s.id
            OR (correction IS NOT NULL AND t.pointProgram.id = s.pointProgram.id)
            OR (expired IS NOT NULL AND expired.user.id = t.user.id
                AND expired.pointProgram.id = t.pointProgram.id
                AND (expired.storefront.id = s.id OR t.pointProgram.id = s.pointProgram.id)))
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
            order by s.created_at
            limit 1
        ) sf on true
        where t.user_id = :userId
        group by pp.id, pp.unit_label, o.id, o.name, sf.category, sf.color, sf.icon_path
        order by member_since
        """,
        nativeQuery = true
    )
    List<Object[]> findMembershipRowsRaw(@Param("userId") UUID userId);

    // The pending queries below spell 'pending' as a literal on purpose: the pending partial
    // index (migration 17) can only serve a query whose predicate implies its WHERE clause, and a
    // bound :state parameter doesn't once the driver switches to a generic prepared plan.

    /** Open redemptions of one program: the dashboard home's pending figures and sidebar badge. */
    @Query(
        value = "select count(t.id) from point_transactions t where t.state = 'pending' and t.point_program_id = :programId",
        nativeQuery = true
    )
    int countPendingByProgramId(@Param("programId") UUID programId);

    /** One row of the pending queue queries below. */
    interface PendingQueueRow {
        UUID getId();
        String getUserName();
        String getRewardTitle();
        int getPoints();
        Instant getCreatedAt();
    }

    /**
     * Selects a pending-queue row: the customer's name and the reward's title come in the same
     * query. Callers add the scope, then {@link #PENDING_QUEUE_ORDER}.
     */
    String PENDING_QUEUE_SELECT = """
        select t.id as id, u.name as userName, r.title as rewardTitle, t.points as points, t.created_at as createdAt
        from point_transactions t
        join users u on u.id = t.user_id
        join rewards r on r.id = t.reward_id
        """;
    /** Oldest first, since the longest-waiting redemption is the one to resolve next. {@code :limit} null means all. */
    String PENDING_QUEUE_ORDER = " order by t.created_at, t.id limit cast(:limit as integer) ";

    /** The organization's whole pending queue (every program), for {@code GET /exchanges/pending}. */
    @Query(
        value = PENDING_QUEUE_SELECT + ORG_JOIN + " where t.state = 'pending' and " + ORG_MATCH + PENDING_QUEUE_ORDER,
        nativeQuery = true
    )
    List<PendingQueueRow> findPendingQueue(@Param("organizationId") UUID organizationId, @Param("limit") Integer limit);

    /** The pending queue of one program, for the dashboard home. */
    @Query(
        value = PENDING_QUEUE_SELECT + " where t.state = 'pending' and t.point_program_id = :programId" + PENDING_QUEUE_ORDER,
        nativeQuery = true
    )
    List<PendingQueueRow> findPendingQueueByProgramId(@Param("programId") UUID programId, @Param("limit") Integer limit);

    /** One row of {@link #findHomeStats}. */
    interface HomeStatsRow {
        long getExchanges();
        long getPreviousExchanges();
        long getActiveCustomers();
        long getPreviousActiveCustomers();
        long getPointsGranted();
        long getPreviousPointsGranted();
        long getPendingExchanges();
    }

    /**
     * Dashboard home figures of one program for {@code [since, now)} and the window before it,
     * {@code [previousSince, since)}, from a single range scan over both windows; the
     * {@code filter} clauses split each figure by window. "Previous" values exist so the page
     * can compare; {@code pendingExchanges} is a snapshot of the open queue at any age, so it
     * has none and comes from the pending partial index instead.
     * <ul>
     *   <li>exchanges: redemptions claimed in the window, pending or delivered.</li>
     *   <li>activeCustomers: distinct customers with a grant (refunds aside) or a non-cancelled
     *       redemption in the window.</li>
     *   <li>pointsGranted: {@link #GRANTED_POINTS_MATCH}, dated by the original lot, so a
     *       later correction changes the window the lot was granted in.</li>
     * </ul>
     */
    @Query(
        value = """
        select
          count(*) filter (where t.transaction_type = 'redeem' and t.state <> 'cancelled' and t.created_at >= :since) as exchanges,
          count(*) filter (where t.transaction_type = 'redeem' and t.state <> 'cancelled' and t.created_at < :since) as previousExchanges,
          count(distinct t.user_id) filter (where t.state <> 'cancelled'
              and ((t.transaction_type = 'earn' and t.refunded_transaction_id is null) or t.transaction_type = 'redeem')
              and t.created_at >= :since) as activeCustomers,
          count(distinct t.user_id) filter (where t.state <> 'cancelled'
              and ((t.transaction_type = 'earn' and t.refunded_transaction_id is null) or t.transaction_type = 'redeem')
              and t.created_at < :since) as previousActiveCustomers,
          coalesce(sum(t.points) filter (where""" + GRANTED_POINTS_MATCH + """
              and coalesce(o.created_at, t.created_at) >= :since), 0) as pointsGranted,
          coalesce(sum(t.points) filter (where""" + GRANTED_POINTS_MATCH + """
              and coalesce(o.created_at, t.created_at) >= :previousSince
              and coalesce(o.created_at, t.created_at) < :since), 0) as previousPointsGranted,
          (select count(*) from point_transactions p
             where p.state = 'pending' and p.point_program_id = :programId) as pendingExchanges
        from point_transactions t
        """ + CORRECTED_LOT_JOIN + """
        where t.point_program_id = :programId
          and t.created_at >= :previousSince
        """,
        nativeQuery = true
    )
    HomeStatsRow findHomeStats(
        @Param("programId") UUID programId,
        @Param("since") OffsetDateTime since,
        @Param("previousSince") OffsetDateTime previousSince
    );

    @Query(value = "select t.* from point_transactions t " + ORG_JOIN + " where " + ORG_MATCH, nativeQuery = true)
    List<PointTransaction> findAllWithRelations(@Param("organizationId") UUID organizationId);

    boolean existsByIdAndPointProgram_Organization_Id(UUID id, UUID organizationId);

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

    /**
     * Row-locking read for the approve/cancel state transition: without this, two concurrent
     * requests both read state=PENDING before either writes, and both succeed -- one of them
     * "approving" a redemption that the other has just refunded. Holding a DB row lock for the
     * remainder of the (short) transaction serializes the two instead.
     */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT t FROM PointTransaction t WHERE t.id = :id")
    Optional<PointTransaction> findByIdForUpdate(@Param("id") UUID id);

    /** Projection of one (user, program) pair with at least one lot due for expiration processing. */
    interface DuePair {
        UUID getUserId();
        UUID getPointProgramId();
    }

    /** Pairs with an earn lot past its expiry date that the expiration job hasn't settled yet. */
    @Query(
        value = """
        select distinct t.user_id as userId, t.point_program_id as pointProgramId
        from point_transactions t
        where t.transaction_type = 'earn' and t.expires_at <= current_timestamp and t.expiry_settled_at is null
        """,
        nativeQuery = true
    )
    List<DuePair> findPairsWithDueExpiration(Pageable pageable);

    /** Due-and-unsettled lots for one (user, program) pair -- what processPair actually expires. */
    @Query(
        value = """
        select t.* from point_transactions t
        where t.user_id = :userId and t.point_program_id = :programId
          and t.transaction_type = 'earn' and t.expires_at <= current_timestamp and t.expiry_settled_at is null
        """,
        nativeQuery = true
    )
    List<PointTransaction> findDueLots(@Param("userId") UUID userId, @Param("programId") UUID programId);

    /**
     * The next lot consumption hasn't reached yet, walking forward from (or from the very start,
     * when afterCreatedAt is null). Excludes already-expired lots (an expire row referencing them
     * exists) so the cursor never tries to draw from a lot that's already been zeroed out,
     * including the rare case where a lot expired out of creation-time order.
     */
    @Query(
        value = """
        select t.* from point_transactions t
        where t.user_id = :userId and t.point_program_id = :programId and t.points > 0
          and (
            cast(:afterCreatedAt as timestamptz) is null
            or t.created_at > :afterCreatedAt
            or (t.created_at = :afterCreatedAt and t.id > :afterId)
          )
          and not exists (select 1 from point_transactions e where e.expired_transaction_id = t.id)
        order by t.created_at asc, t.id asc
        limit 1
        """,
        nativeQuery = true
    )
    Optional<PointTransaction> findNextOpenLot(
        @Param("userId") UUID userId,
        @Param("programId") UUID programId,
        @Param("afterCreatedAt") OffsetDateTime afterCreatedAt,
        @Param("afterId") UUID afterId
    );

    /** Dates only undated, unsettled, nonvoided earn lots from their creation time, preserving assigned deadlines. */
    @Modifying
    @Query(
        value = """
        update point_transactions
        set expires_at = ((created_at at time zone 'UTC') + (:months || ' months')::interval) at time zone 'UTC'
        where point_program_id = :programId and transaction_type = 'earn'
          and expires_at is null and expiry_settled_at is null and voided_at is null
        """,
        nativeQuery = true
    )
    void backfillExpiresAt(@Param("programId") UUID programId, @Param("months") int months);

    /** Disabling expiration clears unsettled earn deadlines, preserving already processed history. */
    @Modifying
    @Query(
        value = """
        update point_transactions
        set expires_at = null
        where point_program_id = :programId and transaction_type = 'earn' and expiry_settled_at is null
        """,
        nativeQuery = true
    )
    void clearExpiresAt(@Param("programId") UUID programId);
}
