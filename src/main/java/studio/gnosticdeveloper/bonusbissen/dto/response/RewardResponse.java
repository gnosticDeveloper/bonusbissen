package studio.gnosticdeveloper.bonusbissen.dto.response;

import studio.gnosticdeveloper.bonusbissen.entity.Reward;

import java.math.BigDecimal;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.Locale;
import java.util.UUID;

public record RewardResponse(
        UUID id,
        String title,
        String description,
        String imagePath,
        int costPoints,
        BigDecimal discountValue,
        boolean active,
        String createdAtFormatted
) {
    private static final ZoneId ZONE_ARGENTINA = ZoneId.of("America/Argentina/Buenos_Aires");
    private static final DateTimeFormatter DATE_FORMAT =
            DateTimeFormatter.ofPattern("d MMM yyyy", Locale.of("es", "AR"));

    public static RewardResponse from(Reward reward) {
        String formattedDate = reward.getCreatedAt()
                .atZoneSameInstant(ZONE_ARGENTINA)
                .format(DATE_FORMAT);

        return new RewardResponse(
                reward.getId(),
                reward.getTitle(),
                reward.getDescription(),
                reward.getImagePath(),
                reward.getCostPoints(),
                reward.getDiscountValue(),
                reward.isActive(),
                formattedDate
        );
    }
}
