package studio.gnosticdeveloper.bonusbissen.dto.response;

import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.Locale;
import java.util.UUID;
import studio.gnosticdeveloper.bonusbissen.entity.PointTransaction;

public record ExchangeResponse(
    UUID id,
    String customerName,
    String employeeName,
    String rewardTitle,
    String state,
    int points,
    String formattedCreatedAt
) {
    private static final ZoneId ZONE_ARGENTINA = ZoneId.of("America/Argentina/Buenos_Aires");
    private static final DateTimeFormatter DATE_FORMAT = DateTimeFormatter.ofPattern("d MMM yyyy", Locale.of("es", "AR"));

    public static ExchangeResponse from(PointTransaction ex) {
        String formattedDate = ex.getCreatedAt().atZoneSameInstant(ZONE_ARGENTINA).format(DATE_FORMAT);

        return new ExchangeResponse(
            ex.getId(),
            ex.getCustomer().getName(),
            ex.getEmployee() != null ? ex.getEmployee().getName() : null,
            ex.getReward() != null ? ex.getReward().getTitle() : null,
            ex.getState().getValue(),
            ex.getPoints(),
            formattedDate
        );
    }
}
