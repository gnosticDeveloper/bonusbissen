package studio.gnosticdeveloper.bonusbissen.dto.response;

import java.math.BigDecimal;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.Locale;
import java.util.UUID;
import studio.gnosticdeveloper.bonusbissen.entity.PointProgram;
import studio.gnosticdeveloper.bonusbissen.entity.PointTransaction;
import studio.gnosticdeveloper.bonusbissen.entity.Reward;
import studio.gnosticdeveloper.bonusbissen.entity.TransactionState;

public record HistoricalExchangeResponse(
    UUID id,
    String rewardTitle,
    String rewardDescription,
    String rewardImagePath,
    BigDecimal discountValue,
    int costPoints,
    String pointsUnitLabel,
    String formattedCreatedAt,
    String state,
    UUID organizationId,
    String organizationName,
    String storefrontName,
    String exchangeCode // solo si state == pending
) {
    private static final ZoneId ZONE_ARGENTINA = ZoneId.of("America/Argentina/Buenos_Aires");
    private static final DateTimeFormatter DATE_FORMAT = DateTimeFormatter.ofPattern("d MMM yyyy", Locale.of("es", "AR"));

    public static HistoricalExchangeResponse from(PointTransaction ex, String exchangeCode) {
        String formattedDate = ex.getCreatedAt().atZoneSameInstant(ZONE_ARGENTINA).format(DATE_FORMAT);
        Reward reward = ex.getReward();
        PointProgram program = ex.getPointProgram();

        return new HistoricalExchangeResponse(
            ex.getId(),
            reward.getTitle(),
            reward.getDescription(),
            reward.getImagePath(),
            reward.getDiscountValue(),
            Math.abs(ex.getPoints()),
            program.getUnitLabel() != null ? program.getUnitLabel() : "puntos",
            formattedDate,
            ex.getState().getValue(),
            program.getOrganization().getId(),
            program.getOrganization().getName(),
            ex.getStorefront() != null ? ex.getStorefront().getName() : null,
            ex.getState() == TransactionState.PENDING ? exchangeCode : null
        );
    }
}
