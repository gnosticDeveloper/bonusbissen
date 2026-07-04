package studio.gnosticdeveloper.bonusbissen.repository;

import studio.gnosticdeveloper.bonusbissen.entity.PointTransaction;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.UUID;

public interface PointTransactionRepository extends JpaRepository<PointTransaction, UUID> {

    Page<PointTransaction> findByCustomerIdOrderByCreatedAtDesc(UUID customerId, Pageable pageable);

    @Query("select coalesce(sum(t.pointsDelta), 0) from PointTransaction t where t.customer.id = :customerId")
    int sumPointsDeltaByCustomerId(@Param("customerId") UUID customerId);
}
