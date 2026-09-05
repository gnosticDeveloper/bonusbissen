package studio.gnosticdeveloper.bonusbissen.dto.response;

import java.util.UUID;
import studio.gnosticdeveloper.bonusbissen.entity.PointTransaction;

public record PointActionResponse(
    UUID id,
    UUID userId,
    String userName,
    String type,
    int amount,
    String note,
    UUID byUserId,
    String byUserName,
    String createdAt
) {
    public static PointActionResponse from(PointTransaction tx) {
        return new PointActionResponse(
            tx.getId(),
            tx.getUser().getId(),
            tx.getUser().getName(),
            "add",
            tx.getPoints(),
            tx.getNote() != null ? tx.getNote() : "",
            tx.getEmployee() != null ? tx.getEmployee().getId() : null,
            tx.getEmployee() != null ? tx.getEmployee().getName() : null,
            tx.getCreatedAt().toString()
        );
    }
}
