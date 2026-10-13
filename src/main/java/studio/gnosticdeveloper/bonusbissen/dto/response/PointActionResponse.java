package studio.gnosticdeveloper.bonusbissen.dto.response;

import java.util.UUID;
import studio.gnosticdeveloper.bonusbissen.entity.PointTransaction;

public record PointActionResponse(
    UUID id,
    UUID userId,
    String userName,
    String type,
    int amount,
    long effectiveAmount,
    String note,
    UUID byUserId,
    String byUserName,
    String createdAt,
    CorrectedTransaction correctedTransaction
) {
    public record CorrectedTransaction(UUID id, int amount, String note, String createdAt) {}
    public static PointActionResponse from(PointTransaction tx) {
        return from(tx, tx.getPoints());
    }

    public static PointActionResponse from(PointTransaction tx, long effectiveAmount) {
        return new PointActionResponse(
            tx.getId(),
            tx.getUser().getId(),
            tx.getUser().getName(),
            tx.getCorrectedTransaction() != null ? "edit" : tx.getPoints() < 0 ? "subtract" : "add",
            tx.getPoints(),
            effectiveAmount,
            tx.getNote() != null ? tx.getNote() : "",
            tx.getEmployee() != null ? tx.getEmployee().getUser().getId() : null,
            tx.getEmployee() != null ? tx.getEmployee().getUser().getName() : null,
            tx.getCreatedAt().toString(),
            tx.getCorrectedTransaction() == null ? null : new CorrectedTransaction(
                tx.getCorrectedTransaction().getId(),
                tx.getCorrectedTransaction().getPoints(),
                tx.getCorrectedTransaction().getNote(),
                tx.getCorrectedTransaction().getCreatedAt().toString()
            )
        );
    }
}
