package studio.gnosticdeveloper.bonusbissen.repository;

import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import studio.gnosticdeveloper.bonusbissen.entity.PointTransaction;
import studio.gnosticdeveloper.bonusbissen.entity.TransactionType;

public interface PointTransactionRepository extends JpaRepository<PointTransaction, UUID> {
    Integer countByState(String state);
    List<PointTransaction> findAllByStateOrderByCreatedAtDesc(String state);

    @Query("select t from PointTransaction t where t.customer.id = :customerId and t.state = :state order by t.createdAt desc")
    List<PointTransaction> findAllPendingByCustomerIdOrderByCreatedAtDesc(@Param("customerId") UUID customerId, @Param("state") String state);

    @Query("select t from PointTransaction t where t.customer.id = :customerId and t.transactionType = :transactionType order by t.createdAt desc")
    List<PointTransaction> findAllByCustomerIdAndTypeOrderByCreatedAtDesc(
        @Param("customerId") UUID customerId,
        @Param("transactionType") TransactionType transactionType
    );

    @Query("select t from PointTransaction t where t.customer.id = :customerId order by t.createdAt desc")
    List<PointTransaction> findAllByCustomerIdOrderByCreatedAtDesc(@Param("customerId") UUID customerId);

    @Query("select coalesce(sum(t.points), 0) from PointTransaction t where t.customer.id = :customerId")
    int calculatePointsByCustomerId(@Param("customerId") UUID customerId);

    @Query("select coalesce(count(t), 0) from PointTransaction t where t.transactionType = :transactionType and t.state != 'cancelled'")
    Integer countByTransactionType(@Param("transactionType") TransactionType transactionType);

    @Query("select coalesce(count(t), 0) from PointTransaction t where t.transactionType = :transactionType and t.state = 'pending'")
    Integer countByTransactionTypeStatePending(@Param("transactionType") TransactionType transactionType);

    @Query("select coalesce(sum(t.points), 0) from PointTransaction t where t.transactionType = :transactionType and t.state = 'delivered'")
    Integer calculatePointsAwarded(@Param("transactionType") TransactionType transactionType);
}
