package studio.gnosticdeveloper.bonusbissen.dto.response;

import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.Locale;
import java.util.UUID;

import studio.gnosticdeveloper.bonusbissen.entity.PointTransaction;
import studio.gnosticdeveloper.bonusbissen.entity.TransactionType;

public record MovementResponse(UUID id, String type, int points, String imagePath, String title, String formattedCreatedAt) {
    private static final ZoneId ZONE_ARGENTINA = ZoneId.of("America/Argentina/Buenos_Aires");
    private static final DateTimeFormatter DATE_FORMAT = DateTimeFormatter.ofPattern("d MMM yyyy", Locale.of("es", "AR"));

    public static MovementResponse from(PointTransaction mv) {
        String formattedDate = mv.getCreatedAt().atZoneSameInstant(ZONE_ARGENTINA).format(DATE_FORMAT);

        String title = mv.getTransactionType() == TransactionType.EARN ? "Sumaste puntos" : mv.getReward().getTitle();

        return new MovementResponse(
            mv.getId(),
            mv.getTransactionType().getValue(),
            mv.getPoints(),
            mv.getReward() != null ? mv.getReward().getImagePath() : null,
            title,
            formattedDate);
    }
}
