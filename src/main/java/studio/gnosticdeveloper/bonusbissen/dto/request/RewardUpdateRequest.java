package studio.gnosticdeveloper.bonusbissen.dto.request;

import jakarta.validation.constraints.Positive;
import studio.gnosticdeveloper.bonusbissen.entity.BenefitType;

import java.math.BigDecimal;
import java.util.UUID;

public record RewardUpdateRequest(
        String name,
        String description,
        @Positive Integer costPoints,
        BenefitType benefitType,
        UUID menuItemId,
        BigDecimal discountValue,
        Boolean active
) {
}
