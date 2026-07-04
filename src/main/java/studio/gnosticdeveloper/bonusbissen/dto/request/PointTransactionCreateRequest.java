package studio.gnosticdeveloper.bonusbissen.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import studio.gnosticdeveloper.bonusbissen.entity.TransactionType;

import java.util.UUID;

public record PointTransactionCreateRequest(
        @NotBlank String customerDocument,
        @NotNull TransactionType type,
        UUID menuItemId,
        UUID rewardId,
        String variantName,
        String note
) {
}
