package studio.gnosticdeveloper.bonusbissen.dto.response;

import java.math.BigDecimal;
import java.util.UUID;

public record HistoricalExchangeResponse(
    UUID id,
    String rewardTitle,
    String rewardDescription,
    String rewardImageUrl,
    BigDecimal discountValue,
    int costPoints,
    String pointsUnitLabel,
    String formattedCreatedAt,
    String state,
    UUID organizationId,
    String organizationName,
    String storefrontName,
    String exchangeCode // solo si state == pending
) {}
