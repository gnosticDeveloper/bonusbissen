package studio.gnosticdeveloper.bonusbissen.dto.response;

import java.util.UUID;

public record MovementResponse(
    UUID id,
    String type,
    int points,
    String imageUrl,
    String title,
    String orgName,
    String storefrontName,
    String pointsLabel,
    String formattedCreatedAt,
    boolean correction,
    UUID correctedTransactionId,
    Integer correctedTransactionAmount
) {
    private static final ZoneId ZONE_ARGENTINA = ZoneId.of("America/Argentina/Buenos_Aires");
    private static final DateTimeFormatter DATE_FORMAT = DateTimeFormatter.ofPattern("d MMM yyyy", Locale.of("es", "AR"));

    public static MovementResponse from(PointTransaction mv) {
        String formattedDate = mv.getCreatedAt().atZoneSameInstant(ZONE_ARGENTINA).format(DATE_FORMAT);

        String title =
            mv.getCorrectedTransaction() != null ? "Corrección de puntos" : mv.getTransactionType() == TransactionType.REDEEM
                ? mv.getReward().getTitle() : mv.getPoints() < 0 ? "Restaste puntos" : "Sumaste puntos";

        return new MovementResponse(
            mv.getId(),
            mv.getTransactionType().getValue(),
            mv.getPoints(),
            mv.getReward() != null ? mv.getReward().getImagePath() : null,
            title,
            mv.getOrganization() != null ? mv.getOrganization().getName() : null,
            mv.getStorefront() != null ? mv.getStorefront().getName() : null,
            mv.getPointProgram() != null ? mv.getPointProgram().getUnitLabel() : null,
            formattedDate,
            mv.getCorrectedTransaction() != null,
            mv.getCorrectedTransaction() != null ? mv.getCorrectedTransaction().getId() : null,
            mv.getCorrectedTransaction() != null ? mv.getCorrectedTransaction().getPoints() : null
        );
    }
}
