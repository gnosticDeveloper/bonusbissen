package studio.gnosticdeveloper.bonusbissen.dto.response;

import studio.gnosticdeveloper.bonusbissen.entity.PointTransaction;
import studio.gnosticdeveloper.bonusbissen.entity.TransactionType;

import java.time.OffsetDateTime;
import java.util.UUID;

public record PointTransactionResponse(
        UUID id,
        String customerDocument,
        TransactionType type,
        UUID menuItemId,
        UUID rewardId,
        String variantName,
        int pointsDelta,
        String note,
        OffsetDateTime createdAt,
        Integer newBalance
) {
    public static PointTransactionResponse from(PointTransaction tx, Integer newBalance) {
        return new PointTransactionResponse(
                tx.getId(),
                tx.getCustomer().getDocument(),
                tx.getType(),
                tx.getMenuItem() != null ? tx.getMenuItem().getId() : null,
                tx.getReward() != null ? tx.getReward().getId() : null,
                tx.getMenuItemVariant() != null ? tx.getMenuItemVariant().getName() : null,
                tx.getPointsDelta(),
                tx.getNote(),
                tx.getCreatedAt(),
                newBalance
        );
    }
}
