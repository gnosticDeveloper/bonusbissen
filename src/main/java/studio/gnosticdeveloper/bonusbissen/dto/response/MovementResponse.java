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
) {}
