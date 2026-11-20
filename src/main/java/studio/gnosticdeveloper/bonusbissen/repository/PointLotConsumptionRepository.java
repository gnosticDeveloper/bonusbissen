package studio.gnosticdeveloper.bonusbissen.repository;

import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import studio.gnosticdeveloper.bonusbissen.entity.PointLotConsumption;

public interface PointLotConsumptionRepository extends JpaRepository<PointLotConsumption, UUID> {
    /** The lots a redemption spent, in the order it spent them. */
    List<PointLotConsumption> findByConsumerTransaction_IdOrderByLotTransaction_CreatedAtAscLotTransaction_IdAsc(UUID consumerTransactionId);
}
