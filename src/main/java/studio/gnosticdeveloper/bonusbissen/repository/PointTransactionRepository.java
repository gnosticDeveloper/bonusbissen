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
    // A transaction's organization isn't a column of its own (see
    // PointTransaction.getOrganization()): a redeem's org is its reward's,
    // a grant's is its employee's, and a refund's is transitively its
    // refunded redeem's reward's.
    String ORG_JOINS =
        """
            left join rewards r on r.id = t.reward_id
            left join employees e on e.id = t.employee_id
            left join point_transactions rt on rt.id = t.refunded_transaction_id
            left join rewards rtr on rtr.id = rt.reward_id
        """;
    String ORG_MATCH = "(r.organization_id = :organizationId or e.organization_id = :organizationId or rtr.organization_id = :organizationId)";

    @Query(value = "select t.* from point_transactions t where t.user_id = :userId and t.state = :state order by t.created_at desc", nativeQuery = true)
    List<PointTransaction> findAllPendingByUserIdOrderByCreatedAtDescRaw(@Param("userId") UUID userId, @Param("state") String state);

    default List<PointTransaction> findAllPendingByUserIdOrderByCreatedAtDesc(UUID userId, TransactionState state) {
        return findAllPendingByUserIdOrderByCreatedAtDescRaw(userId, state.getValue());
    }

    @Query(
        value = "select t.* from point_transactions t where t.user_id = :userId and t.transaction_type = :transactionType order by t.created_at desc",
        nativeQuery = true
    )
    List<PointTransaction> findAllByUserIdAndTypeOrderByCreatedAtDescRaw(@Param("userId") UUID userId, @Param("transactionType") String transactionType);

    default List<PointTransaction> findAllByUserIdAndTypeOrderByCreatedAtDesc(UUID userId, TransactionType transactionType) {
        return findAllByUserIdAndTypeOrderByCreatedAtDescRaw(userId, transactionType.getValue());
    }

    @Query(value = "select t.* from point_transactions t where t.user_id = :userId order by t.created_at desc", nativeQuery = true)
    List<PointTransaction> findAllByUserIdOrderByCreatedAtDesc(@Param("userId") UUID userId);

    @Query(value = "select coalesce(sum(t.points), 0) from point_transactions t where t.user_id = :userId", nativeQuery = true)
    int calculatePointsByUserId(@Param("userId") UUID userId);

    @Query(value = "select coalesce(count(t.id), 0) from point_transactions t " + ORG_JOINS + "where t.state = :state and " + ORG_MATCH, nativeQuery = true)
    Integer countByStateAndOrganizationIdRaw(@Param("state") String state, @Param("organizationId") UUID organizationId);

    default Integer countByStateAndOrganizationId(TransactionState state, UUID organizationId) {
        return countByStateAndOrganizationIdRaw(state.getValue(), organizationId);
    }

    @Query(
        value = "select t.* from point_transactions t " + ORG_JOINS + "where t.state = :state and " + ORG_MATCH + " order by t.created_at desc",
        nativeQuery = true
    )
    List<PointTransaction> findAllByStateAndOrganizationIdOrderByCreatedAtDescRaw(@Param("state") String state, @Param("organizationId") UUID organizationId);

    default List<PointTransaction> findAllByStateAndOrganizationIdOrderByCreatedAtDesc(TransactionState state, UUID organizationId) {
        return findAllByStateAndOrganizationIdOrderByCreatedAtDescRaw(state.getValue(), organizationId);
    }

    @Query(
        value = "select coalesce(count(t.id), 0) from point_transactions t " +
            ORG_JOINS +
            "where t.transaction_type = :transactionType and t.state != 'cancelled' and " +
            ORG_MATCH,
        nativeQuery = true
    )
    Integer countByTransactionTypeRaw(@Param("transactionType") String transactionType, @Param("organizationId") UUID organizationId);

    default Integer countByTransactionType(TransactionType transactionType, UUID organizationId) {
        return countByTransactionTypeRaw(transactionType.getValue(), organizationId);
    }

    @Query(
        value = "select coalesce(count(t.id), 0) from point_transactions t " +
            ORG_JOINS +
            "where t.transaction_type = :transactionType and t.state = 'pending' and " +
            ORG_MATCH,
        nativeQuery = true
    )
    Integer countByTransactionTypeStatePendingRaw(@Param("transactionType") String transactionType, @Param("organizationId") UUID organizationId);

    default Integer countByTransactionTypeStatePending(TransactionType transactionType, UUID organizationId) {
        return countByTransactionTypeStatePendingRaw(transactionType.getValue(), organizationId);
    }

    @Query(
        value = "select coalesce(sum(t.points), 0) from point_transactions t " +
            ORG_JOINS +
            "where t.transaction_type = :transactionType and t.state = 'delivered' and " +
            ORG_MATCH,
        nativeQuery = true
    )
    Integer calculatePointsAwardedRaw(@Param("transactionType") String transactionType, @Param("organizationId") UUID organizationId);

    default Integer calculatePointsAwarded(TransactionType transactionType, UUID organizationId) {
        return calculatePointsAwardedRaw(transactionType.getValue(), organizationId);
    }

    @Query(value = "select t.* from point_transactions t " + ORG_JOINS + "where " + ORG_MATCH, nativeQuery = true)
    List<PointTransaction> findAllWithRelations(@Param("organizationId") UUID organizationId);

    @Query(
        value =
            """
            select t.* from point_transactions t
            join employees e on e.id = t.employee_id
            where e.organization_id = :organizationId
              and t.transaction_type = 'earn'
              and (:userId is null or t.user_id = :userId)
            order by t.created_at desc
            """,
        nativeQuery = true
    )
    List<PointTransaction> findGrantHistory(@Param("organizationId") UUID organizationId, @Param("userId") UUID userId, Pageable pageable);

    @Query(
        value =
            """
            select t.* from point_transactions t
            join rewards r on r.id = t.reward_id
            where r.organization_id = :organizationId
              and t.transaction_type = 'redeem'
              and t.state != 'pending'
            order by t.created_at desc
            """,
        nativeQuery = true
    )
    List<PointTransaction> findAllResolvedByOrganizationId(@Param("organizationId") UUID organizationId, Pageable pageable);
}
