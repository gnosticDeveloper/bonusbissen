package studio.gnosticdeveloper.bonusbissen.dto.response;

import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.Locale;
import java.util.UUID;
import studio.gnosticdeveloper.bonusbissen.entity.PointTransaction;

public record PendingExchangeResponse(UUID id, String rewardTitle, int points, String exchangeCode, String createdAtFormatted) {
    private static final ZoneId ZONE_ARGENTINA = ZoneId.of("America/Argentina/Buenos_Aires");
    private static final DateTimeFormatter DATE_FORMAT = DateTimeFormatter.ofPattern("d MMM yyyy", Locale.of("es", "AR"));

    public static PendingExchangeResponse from(PointTransaction tx) {
        String formattedDate = tx.getCreatedAt().atZoneSameInstant(ZONE_ARGENTINA).format(DATE_FORMAT);

        return new PendingExchangeResponse(tx.getId(), tx.getReward().getTitle(), tx.getPoints(), tx.getExchangeCode().getCode(), formattedDate);
    }
}
