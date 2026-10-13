package studio.gnosticdeveloper.bonusbissen.dto.response;

import java.math.BigDecimal;
import java.util.UUID;

public record ExchangeResponse(
    UUID id,
    UUID userId,
    String userName,
    String username,
    String employeeName,
    UUID rewardId,
    String rewardTitle,
    String rewardDescription,
    String rewardImageUrl,
    BigDecimal rewardDiscountValue,
    int rewardCostPoints,
    String state,
    int points,
    String formattedCreatedAt
) {}
