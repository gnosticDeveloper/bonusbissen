package studio.gnosticdeveloper.bonusbissen.merchant;

import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface OnlinePurchaseRepository extends JpaRepository<OnlinePurchase, UUID> {
    Optional<OnlinePurchase> findByIntegration_IdAndOrderId(UUID integrationId, String orderId);
}
