package studio.gnosticdeveloper.bonusbissen.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import studio.gnosticdeveloper.bonusbissen.entity.BenefitType;

import java.math.BigDecimal;
import java.util.UUID;

public record RewardCreateRequest(
        @NotBlank String name,
        String description,
        @NotNull @Positive Integer costPoints,
        @NotNull BenefitType benefitType,
        UUID menuItemId,
        BigDecimal discountValue
) {
}
