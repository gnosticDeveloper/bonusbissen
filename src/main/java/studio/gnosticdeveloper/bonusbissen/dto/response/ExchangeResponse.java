package studio.gnosticdeveloper.bonusbissen.dto.response;

import java.math.BigDecimal;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.Locale;
import java.util.UUID;
import studio.gnosticdeveloper.bonusbissen.entity.PointTransaction;
import studio.gnosticdeveloper.bonusbissen.entity.Reward;

public record ExchangeResponse(
    UUID id,
    UUID userId,
    String userName,
    String username,
    String employeeName,
    UUID rewardId,
    String rewardTitle,
    String rewardDescription,
    String rewardImagePath,
    BigDecimal rewardDiscountValue,
    int rewardCostPoints,
    String state,
    int points,
    String formattedCreatedAt
) {
    private static final ZoneId ZONE_ARGENTINA = ZoneId.of("America/Argentina/Buenos_Aires");
    private static final DateTimeFormatter DATE_FORMAT = DateTimeFormatter.ofPattern("d MMM yyyy", Locale.of("es", "AR"));

    public static ExchangeResponse from(PointTransaction ex) {
        String formattedDate = ex.getCreatedAt().atZoneSameInstant(ZONE_ARGENTINA).format(DATE_FORMAT);
        Reward reward = ex.getReward();

        return new ExchangeResponse(
            ex.getId(),
            ex.getUser().getId(),
            ex.getUser().getName(),
            ex.getUser().getUsername(),
            ex.getEmployee() != null ? ex.getEmployee().getUser().getName() : null,
            reward != null ? reward.getId() : null,
            reward != null ? reward.getTitle() : null,
            reward != null ? reward.getDescription() : null,
            reward != null ? reward.getImagePath() : null,
            reward != null ? reward.getDiscountValue() : null,
            reward != null ? reward.getCostPoints() : 0,
            ex.getState().getValue(),
            ex.getPoints(),
            formattedDate
        );
    }
}
