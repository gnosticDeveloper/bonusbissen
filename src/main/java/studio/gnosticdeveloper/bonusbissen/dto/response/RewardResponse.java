package studio.gnosticdeveloper.bonusbissen.dto.response;

import studio.gnosticdeveloper.bonusbissen.entity.BenefitType;
import studio.gnosticdeveloper.bonusbissen.entity.Reward;

import java.math.BigDecimal;
import java.util.UUID;

public record RewardResponse(
        UUID id,
        String name,
        String description,
        int costPoints,
        BenefitType benefitType,
        UUID menuItemId,
        BigDecimal discountValue,
        boolean active
) {
    public static RewardResponse from(Reward reward) {
        return new RewardResponse(
                reward.getId(),
                reward.getName(),
                reward.getDescription(),
                reward.getCostPoints(),
                reward.getBenefitType(),
                reward.getMenuItem() != null ? reward.getMenuItem().getId() : null,
                reward.getDiscountValue(),
                reward.isActive()
        );
    }
}
