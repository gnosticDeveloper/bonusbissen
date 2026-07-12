package studio.gnosticdeveloper.bonusbissen.dto.response;

import studio.gnosticdeveloper.bonusbissen.entity.Exchange;

import java.time.OffsetDateTime;
import java.util.UUID;

public record ExchangeResponse(
        UUID id,
        String customerDocument,
        UUID menuItemId,
        UUID rewardId,
        String variantName,
        int pointsDelta,
        String note,
        OffsetDateTime createdAt,
        Integer newBalance
) {
    public static ExchangeResponse from(Exchange tx, Integer newBalance) {
        return new ExchangeResponse(
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
