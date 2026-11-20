package studio.gnosticdeveloper.bonusbissen.repository;

import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import studio.gnosticdeveloper.bonusbissen.entity.BillingPlan;

public interface BillingPlanRepository extends JpaRepository<BillingPlan, UUID> {

    List<BillingPlan> findAllByActiveTrueOrderByPriceAsc();
}
