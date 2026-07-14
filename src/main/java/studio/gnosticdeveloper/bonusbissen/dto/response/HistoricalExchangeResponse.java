package studio.gnosticdeveloper.bonusbissen.dto.response;

import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.Locale;
import java.util.UUID;
import studio.gnosticdeveloper.bonusbissen.entity.PointTransaction;

public record HistoricalExchangeResponse(UUID id, String rewardTitle, int costPoints, String formattedCreatedAt, String state) {
    private static final ZoneId ZONE_ARGENTINA = ZoneId.of("America/Argentina/Buenos_Aires");
    private static final DateTimeFormatter DATE_FORMAT = DateTimeFormatter.ofPattern("d MMM yyyy", Locale.of("es", "AR"));

    public static HistoricalExchangeResponse from(PointTransaction ex) {
        String formattedDate = ex.getCreatedAt().atZoneSameInstant(ZONE_ARGENTINA).format(DATE_FORMAT);

        return new HistoricalExchangeResponse(
            ex.getId(),
            ex.getReward() != null ? ex.getReward().getTitle() : null,
            ex.getPoints(),
            formattedDate,
            ex.getState()
        );
    }
}
